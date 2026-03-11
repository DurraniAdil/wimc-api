import { Router, Request, Response } from 'express';
import { Cafe } from '../models/Cafe.js';

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
