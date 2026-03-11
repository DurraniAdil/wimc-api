import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const adminRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

adminRouter.post('/login', (req: Request, res: Response) => {
    const { password } = req.body;

    if (!password) {
        res.status(400).json({ error: 'Password is required' });
        return;
    }

    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Unauthorized: Incorrect password' });
    }
});
