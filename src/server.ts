import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { cafeRouter } from './routes/cafes.js';

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:3000', 'https://whereismycafe.vercel.app'] }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────
app.use('/api/cafes', cafeRouter);

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🚀  WIMC API running at http://localhost:${PORT}\n`);
});
