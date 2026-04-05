import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CafeOwner, ICafeOwner } from '../models/CafeOwner.js';

const JWT_SECRET = process.env.JWT_SECRET || 'wimc-super-secret-key-2026';

export interface CafeOwnerRequest extends Request {
  owner?: ICafeOwner;
}

/**
 * Authenticate cafe owner from JWT token.
 * Attaches owner document to req.owner
 */
export const requireCafeOwner = async (
  req: CafeOwnerRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      role: string;
      cafeId: string;
      context: string;
    };

    // Ensure this token was issued for cafe-owner context
    if (decoded.context !== 'cafe-owner') {
      return res.status(403).json({ message: 'Invalid token context' });
    }

    const owner = await CafeOwner.findById(decoded.id);
    if (!owner) {
      return res.status(401).json({ message: 'Owner account not found' });
    }

    req.owner = owner;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Restrict route to 'owner' role only (not 'viewer').
 * Must be used AFTER requireCafeOwner.
 */
export const requireOwnerRole = (
  req: CafeOwnerRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.owner || req.owner.role !== 'owner') {
    return res.status(403).json({ message: 'Owner role required for this action' });
  }
  next();
};
