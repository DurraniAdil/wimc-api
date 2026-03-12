import { Router, Request, Response } from 'express';
import { Cafe } from '../models/Cafe.js';
import { requireAdmin } from '../middleware/auth.js';

export const cafeRouter = Router();

// GET /api/cafes — list all cafés (with optional query filters)
cafeRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { vibe, area, maxPrice, trending, isNewCafe, page, limit, search } = req.query;

    const query: any = {};

    // Full-text search (name, area, description)
    if (typeof search === 'string' && search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { area: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

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
// GET /api/cafes/trending — list trending cafés
cafeRouter.get('/trending', async (req: Request, res: Response) => {
  try {
    const results = await Cafe.find({ isTrending: true }).sort({ rating: -1 });
    res.json(results);
  } catch (error) {
    console.error('Error fetching trending cafes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/cafes/new — list new cafés
cafeRouter.get('/new', async (req: Request, res: Response) => {
  try {
    const results = await Cafe.find({ isNewCafe: true }).sort({ addedOn: -1 });
    res.json(results);
  } catch (error) {
    console.error('Error fetching new cafes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/cafes/random — get a single random café
cafeRouter.get('/random', async (req: Request, res: Response) => {
  try {
    const results = await Cafe.aggregate([{ $sample: { size: 1 } }]);
    if (results.length === 0) {
      res.status(404).json({ error: 'No cafés found' });
      return;
    }
    res.json(results[0]);
  } catch (error) {
    console.error('Error fetching random cafe:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/cafes/nearby — list cafés sorted by distance
cafeRouter.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) {
      res.status(400).json({ error: 'Latitude and Longitude are required' });
      return;
    }

    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    const rKm = parseFloat(radius as string) || 3;

    const cafes = await Cafe.find({
      latitude: { $ne: null },
      longitude: { $ne: null }
    });

    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const nearbyCafes = cafes
      .map((cafe) => {
        const distance = haversine(userLat, userLng, cafe.latitude, cafe.longitude);
        return {
          ...cafe.toObject(),
          distanceKm: parseFloat(distance.toFixed(2))
        };
      })
      .filter((cafe) => cafe.distanceKm <= rKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(nearbyCafes);
  } catch (error) {
    console.error('Error fetching nearby cafes:', error);
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

// POST /api/cafes — Add a new café (JWT Protected)
cafeRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const newCafe = new Cafe(req.body);
    const savedCafe = await newCafe.save();
    res.status(201).json(savedCafe);
  } catch (error: any) {
    console.error('Error creating cafe:', error);
    res.status(400).json({ error: error.message || 'Error creating cafe' });
  }
});

// PATCH /api/cafes/:id — Edit an existing café (JWT Protected)
cafeRouter.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const updatedCafe = await Cafe.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedCafe) {
      res.status(404).json({ error: 'Café not found' });
      return;
    }

    res.json(updatedCafe);
  } catch (error: any) {
    console.error('Error updating cafe:', error);
    res.status(400).json({ error: error.message || 'Error updating cafe' });
  }
});

// DELETE /api/cafes/:id — Delete a café (JWT Protected)
cafeRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const deletedCafe = await Cafe.findOneAndDelete({ id: req.params.id });

    if (!deletedCafe) {
      res.status(404).json({ error: 'Café not found' });
      return;
    }

    res.json({ message: 'Café deleted successfully', id: req.params.id });
  } catch (error: any) {
    console.error('Error deleting cafe:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
