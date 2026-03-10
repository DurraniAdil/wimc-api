import { Router, Request, Response } from 'express';
import { Cafe } from '../models/Cafe.js';

export const cafeRouter = Router();

// GET /api/cafes — list all cafés (with optional query filters)
cafeRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { vibe, area, maxPrice, trending, isNewCafe } = req.query;

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
