import express from 'express';
import { User } from '../models/User.js';
import { requireAuth, AuthRequest } from '../middleware/userAuth.js';

export const userRouter = express.Router();

// Get current user profile
userRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});
