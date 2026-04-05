import express from 'express';
import jwt from 'jsonwebtoken';
import { CafeOwner } from '../models/CafeOwner.js';
import { Transaction } from '../models/Transaction.js';
import { requireCafeOwner, requireOwnerRole, CafeOwnerRequest } from '../middleware/cafeOwnerAuth.js';

export const financeRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'wimc-super-secret-key-2026';

// ─── Login ──────────────────────────────────────────────────
financeRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const owner = await CafeOwner.findOne({ email }).select('+password');
    if (!owner) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await owner.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: owner._id, role: owner.role, cafeId: owner.cafeId, context: 'cafe-owner' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, owner });
  } catch (error) {
    console.error('Finance login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// ─── Register ───────────────────────────────────────────────
financeRouter.post('/register', async (req, res) => {
  try {
    const { name, cafeName, email, password, passcode } = req.body;

    if (!name || !cafeName || !email || !password || !passcode) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (passcode !== 'accessgrantedforwimcfinance') {
      return res.status(403).json({ message: 'Invalid registration passcode' });
    }

    const existingOwner = await CafeOwner.findOne({ email });
    if (existingOwner) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const cafeId = cafeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const owner = new CafeOwner({
      name,
      email,
      password,
      cafeName,
      cafeId,
      role: 'owner'
    });

    await owner.save();

    const token = jwt.sign(
      { id: owner._id, role: owner.role, cafeId: owner.cafeId, context: 'cafe-owner' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, owner: { _id: owner._id, name: owner.name, email: owner.email, cafeName: owner.cafeName, cafeId: owner.cafeId, role: owner.role } });
  } catch (error) {
    console.error('Finance register error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// ─── Get owner profile ──────────────────────────────────────
financeRouter.get('/me', requireCafeOwner, async (req: CafeOwnerRequest, res) => {
  res.json({ owner: req.owner });
});

// ─── Dashboard summary ──────────────────────────────────────
financeRouter.get('/summary', requireCafeOwner, async (req: CafeOwnerRequest, res) => {
  try {
    const cafeId = req.owner!.cafeId;

    // Aggregate totals
    const [totals] = await Transaction.aggregate([
      { $match: { cafeId } },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
          },
          totalExpenses: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
          },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const totalIncome = totals?.totalIncome || 0;
    const totalExpenses = totals?.totalExpenses || 0;

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Transaction.aggregate([
      { $match: { cafeId, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          income: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
          },
          expenses: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Category breakdown (expenses)
    const categoryBreakdown = await Transaction.aggregate([
      { $match: { cafeId, type: 'expense' } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Recent transactions (last 5)
    const recentTransactions = await Transaction.find({ cafeId })
      .sort({ date: -1 })
      .limit(5)
      .lean();

    res.json({
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount: totals?.transactionCount || 0,
      monthlyTrend,
      categoryBreakdown,
      recentTransactions
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ message: 'Error fetching summary' });
  }
});

// ─── List transactions ──────────────────────────────────────
financeRouter.get('/transactions', requireCafeOwner, async (req: CafeOwnerRequest, res) => {
  try {
    const cafeId = req.owner!.cafeId;
    const {
      type,
      category,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
      startDate,
      endDate,
      page = '1',
      limit = '50'
    } = req.query;

    // Build filter
    const filter: any = { cafeId };
    if (type && (type === 'income' || type === 'expense')) filter.type = type;
    if (category) filter.category = category;
    if (search) filter.description = { $regex: search, $options: 'i' };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

    // Sort
    const sortField = ['date', 'amount', 'category', 'type'].includes(sortBy as string) ? sortBy : 'date';
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ [sortField as string]: sortDir })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    res.json({
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('List transactions error:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

// ─── Add transaction (owner only) ───────────────────────────
financeRouter.post('/transactions', requireCafeOwner, requireOwnerRole, async (req: CafeOwnerRequest, res) => {
  try {
    const { type, category, amount, description, date } = req.body;

    if (!type || !category || !amount || !description || !date) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const transaction = new Transaction({
      cafeId: req.owner!.cafeId,
      ownerId: req.owner!._id,
      type,
      category,
      amount: Number(amount),
      description,
      date: new Date(date)
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ message: 'Error adding transaction' });
  }
});

// ─── Edit transaction (owner only) ──────────────────────────
financeRouter.patch('/transactions/:id', requireCafeOwner, requireOwnerRole, async (req: CafeOwnerRequest, res) => {
  try {
    const { id } = req.params;
    const { type, category, amount, description, date } = req.body;

    const transaction = await Transaction.findOne({ _id: id, cafeId: req.owner!.cafeId });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (type) transaction.type = type;
    if (category) transaction.category = category;
    if (amount !== undefined) transaction.amount = Number(amount);
    if (description) transaction.description = description;
    if (date) transaction.date = new Date(date);

    await transaction.save();
    res.json(transaction);
  } catch (error) {
    console.error('Edit transaction error:', error);
    res.status(500).json({ message: 'Error updating transaction' });
  }
});

// ─── Delete transaction (owner only) ────────────────────────
financeRouter.delete('/transactions/:id', requireCafeOwner, requireOwnerRole, async (req: CafeOwnerRequest, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOneAndDelete({ _id: id, cafeId: req.owner!.cafeId });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: 'Error deleting transaction' });
  }
});

// ─── Insights ───────────────────────────────────────────────
financeRouter.get('/insights', requireCafeOwner, async (req: CafeOwnerRequest, res) => {
  try {
    const cafeId = req.owner!.cafeId;

    // Top spending categories
    const topCategories = await Transaction.aggregate([
      { $match: { cafeId, type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    // Top income sources
    const topIncomeSources = await Transaction.aggregate([
      { $match: { cafeId, type: 'income' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    // Monthly comparison (current vs previous month)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [currentMonth] = await Transaction.aggregate([
      { $match: { cafeId, date: { $gte: currentMonthStart } } },
      {
        $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
        }
      }
    ]);

    const [prevMonth] = await Transaction.aggregate([
      { $match: { cafeId, date: { $gte: prevMonthStart, $lt: currentMonthStart } } },
      {
        $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
        }
      }
    ]);

    // Average transaction values
    const [avgValues] = await Transaction.aggregate([
      { $match: { cafeId } },
      {
        $group: {
          _id: '$type',
          avg: { $avg: '$amount' },
          max: { $max: '$amount' },
          min: { $min: '$amount' }
        }
      }
    ]);

    // Daily average (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyAvg = await Transaction.aggregate([
      { $match: { cafeId, date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      topCategories,
      topIncomeSources,
      currentMonth: {
        income: currentMonth?.income || 0,
        expenses: currentMonth?.expenses || 0,
        profit: (currentMonth?.income || 0) - (currentMonth?.expenses || 0)
      },
      previousMonth: {
        income: prevMonth?.income || 0,
        expenses: prevMonth?.expenses || 0,
        profit: (prevMonth?.income || 0) - (prevMonth?.expenses || 0)
      },
      dailyAvg
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ message: 'Error fetching insights' });
  }
});

// ─── Export (owner only) ────────────────────────────────────
financeRouter.get('/export', requireCafeOwner, requireOwnerRole, async (req: CafeOwnerRequest, res) => {
  try {
    const cafeId = req.owner!.cafeId;
    const { format = 'csv' } = req.query;

    const transactions = await Transaction.find({ cafeId })
      .sort({ date: -1 })
      .lean();

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${cafeId}-transactions.json"`);
      return res.json(transactions);
    }

    // CSV format
    const headers = 'Date,Type,Category,Amount,Description\n';
    const rows = transactions.map(t => {
      const date = new Date(t.date).toISOString().split('T')[0];
      const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
      return `${date},${t.type},${t.category},${t.amount},${desc}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${cafeId}-transactions.csv"`);
    res.send(headers + rows);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Error exporting data' });
  }
});
