import express from 'express';
import { User } from '../models/User.js';
import { requireAuth, AuthRequest } from '../middleware/userAuth.js';

export const collectionsRouter = express.Router();

// Get user collections
collectionsRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.collections);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching collections' });
  }
});

// Toggle heart status
collectionsRouter.post('/toggle', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { cafeId } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const index = user.collections.hearted.indexOf(cafeId);
    if (index > -1) {
      user.collections.hearted.splice(index, 1);
    } else {
      user.collections.hearted.push(cafeId);
    }

    await user.save();
    res.json(user.collections);
  } catch (error) {
    res.status(500).json({ message: 'Error toggling heart' });
  }
});

// Sync local data
collectionsRouter.post('/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { hearted, visited } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Merging logic: prefer backend data but add new local items
    const newHearted = Array.from(new Set([...user.collections.hearted, ...hearted]));
    
    // For visited, we might want to be more careful, but for now simple merge
    const existingVisitedIds = user.collections.visited.map(v => v.id);
    const newVisited = [...user.collections.visited];
    
    visited.forEach((v: { id: string, date: string }) => {
      if (!existingVisitedIds.includes(v.id)) {
        newVisited.push(v);
      }
    });

    user.collections.hearted = newHearted;
    user.collections.visited = newVisited;

    await user.save();
    res.json(user.collections);
  } catch (error) {
    res.status(500).json({ message: 'Sync failed' });
  }
});

// Remove visited cafe
collectionsRouter.post('/visited/remove', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { cafeId } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.collections.visited = user.collections.visited.filter(v => v.id !== cafeId);

    await user.save();
    res.json(user.collections);
  } catch (error) {
    res.status(500).json({ message: 'Error removing visited cafe' });
  }
});

