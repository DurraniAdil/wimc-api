import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { cafeRouter } from './routes/cafes.js';
import { adminRouter } from './routes/admin.js';
import { uploadRouter } from './routes/upload.js';
import reviewsRouter from './routes/reviews.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { collectionsRouter } from './routes/collections.js';
import { checkEmailConfig } from './utils/sendEmail.js';

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:3000', 'https://whereismycafe.vercel.app'] }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────
app.use('/api/cafes', cafeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api', reviewsRouter);

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    v: 'v6', 
    mailConfig: checkEmailConfig(),
    timestamp: new Date().toISOString() 
  });
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🚀  WIMC API running at http://localhost:${PORT}\n`);
});
