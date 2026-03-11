import { Router, Request, Response } from 'express';
import { Cafe } from '../models/Cafe.js';
import { requireAdmin } from '../middleware/auth.js';

export const cafeRouter = Router();

// GET /api/cafes — list all cafés (with optional query filters)
cafeRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { vibe, area, maxPrice, trending, isNewCafe, page, limit } = req.query;

    const query: any = {};

    // Filter by vibe (e.g. ?vibe=Study)
    if (typeof vibe === 'string') {
      // Case-insensitive regex match within the vibes array
      query.vibes = { $regex: new RegExp(vibe, 'i') };
    }

    // Filter by area substring (e.g. ?area=CIDCO)
    if (typeof area === 'string') {
      query.area = { $regex: new RegExp(area, 'i') };
    }

    // Filter by max price for two (e.g. ?maxPrice=300)
    if (typeof maxPrice === 'string') {
      const max = parseInt(maxPrice, 10);
      if (!isNaN(max)) {
        query.priceForTwo = { $lte: max };
      }
    }

    // Filter trending (e.g. ?trending=true)
    if (trending === 'true') {
      query.isTrending = true;
    }

    // Filter new (e.g. ?isNewCafe=true)
    if (isNewCafe === 'true') {
      query.isNewCafe = true;
    }

    // If pagination params are present, return paginated data
    if (page || limit) {
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [results, total] = await Promise.all([
        Cafe.find(query).skip(skip).limit(limitNum),
        Cafe.countDocuments(query),
      ]);

      res.json({
        data: results,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
      return;
    }

    // Otherwise, return backward-compatible array
    const results = await Cafe.find(query);
    res.json(results);
  } catch (error) {
    console.error('Error fetching cafes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/cafes/:id — single café by ID
cafeRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const cafe = await Cafe.findOne({ id: req.params.id });
    if (!cafe) {
      res.status(404).json({ error: 'Café not found' });
      return;
    }
    res.json(cafe);
  } catch (error) {
    console.error('Error fetching cafe by id:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/cafes — Add a new café (JWT Protected)
cafeRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const newCafe = new Cafe(req.body);
    const savedCafe = await newCafe.save();
    res.status(201).json(savedCafe);
  } catch (error: any) {
    console.error('Error creating cafe:', error);
    res.status(400).json({ error: error.message || 'Error creating cafe' });
  }
});

// PATCH /api/cafes/:id — Edit an existing café (JWT Protected)
cafeRouter.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const updatedCafe = await Cafe.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedCafe) {
      res.status(404).json({ error: 'Café not found' });
      return;
    }

    res.json(updatedCafe);
  } catch (error: any) {
    console.error('Error updating cafe:', error);
    res.status(400).json({ error: error.message || 'Error updating cafe' });
  }
});

// DELETE /api/cafes/:id — Delete a café (JWT Protected)
cafeRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const deletedCafe = await Cafe.findOneAndDelete({ id: req.params.id });

    if (!deletedCafe) {
      res.status(404).json({ error: 'Café not found' });
      return;
    }

    res.json({ message: 'Café deleted successfully', id: req.params.id });
  } catch (error: any) {
    console.error('Error deleting cafe:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
