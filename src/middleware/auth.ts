import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
        if (decoded.role !== 'admin') {
            res.status(403).json({ error: 'Forbidden: Invalid role' });
            return;
        }
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
