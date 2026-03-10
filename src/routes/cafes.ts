import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

// ── Load café data from JSON ────────────────────────────────
const dataPath = join(process.cwd(), 'data', 'cafes.json');
const cafes = JSON.parse(readFileSync(dataPath, 'utf-8'));

export const cafeRouter = Router();

// GET /api/cafes — list all cafés (with optional query filters)
cafeRouter.get('/', (_req: Request, res: Response) => {
  const { vibe, area, maxPrice, trending, isNew } = _req.query;

  let results = [...cafes];

  // Filter by vibe (e.g. ?vibe=Study)
  if (typeof vibe === 'string') {
    results = results.filter((c: any) =>
      c.vibes.some((v: string) => v.toLowerCase() === vibe.toLowerCase())
    );
  }

  // Filter by area substring (e.g. ?area=CIDCO)
  if (typeof area === 'string') {
    results = results.filter((c: any) =>
      c.area.toLowerCase().includes(area.toLowerCase())
    );
  }

  // Filter by max price for two (e.g. ?maxPrice=300)
  if (typeof maxPrice === 'string') {
    const max = parseInt(maxPrice, 10);
    if (!isNaN(max)) {
      results = results.filter((c: any) => c.priceForTwo <= max);
    }
  }

  // Filter trending (e.g. ?trending=true)
  if (trending === 'true') {
    results = results.filter((c: any) => c.isTrending);
  }

  // Filter new (e.g. ?isNew=true)
  if (isNew === 'true') {
    results = results.filter((c: any) => c.isNew);
  }

  res.json(results);
});

// GET /api/cafes/:id — single café by ID
cafeRouter.get('/:id', (req: Request, res: Response) => {
  const cafe = cafes.find((c: any) => c.id === req.params.id);
  if (!cafe) {
    res.status(404).json({ error: 'Café not found' });
    return;
  }
  res.json(cafe);
});
