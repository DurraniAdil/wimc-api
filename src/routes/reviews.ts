import express, { Request, Response } from 'express';
import Review from '../models/Review';
import { Cafe } from '../models/Cafe';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();

// 1. POST /api/cafes/:id/reviews - Add a review
router.post('/cafes/:id/reviews', async (req: Request, res: Response) => {
    try {
        const { rating, comment } = req.body;
        const cafeId = req.params.id;

        // Validation
        if (!rating || rating < 1 || rating > 5) {
            res.status(400).json({ error: 'Rating must be between 1 and 5' });
            return;
        }

        if (comment && comment.length > 500) {
            res.status(400).json({ error: 'Comment must be 500 characters or less' });
            return;
        }

        // Generate anonymousId
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const anonymousId = `CafeGoer#${randomDigits}`;

        const review = new Review({
            cafeId,
            anonymousId,
            rating,
            comment,
            isVisible: true
        });

        await review.save();
        res.status(201).json(review);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// 2. GET /api/cafes/:id/reviews - Get reviews for a cafe
router.get('/cafes/:id/reviews', async (req: Request, res: Response) => {
    try {
        const cafeId = req.params.id;
        const reviews = await Review.find({ cafeId, isVisible: true })
            .sort({ createdAt: -1 })
            .select('anonymousId rating comment createdAt');
        
        res.json(reviews);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// 3. GET /api/admin/reviews - Get ALL reviews (Admin Only)
router.get('/admin/reviews', requireAdmin, async (req: Request, res: Response) => {
    try {
        const reviews = await Review.aggregate([
            {
                $lookup: {
                    from: 'cafes',
                    localField: 'cafeId',
                    foreignField: 'id',
                    as: 'cafeInfo'
                }
            },
            {
                $unwind: {
                    path: '$cafeInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    cafeId: 1,
                    cafeName: '$cafeInfo.name',
                    anonymousId: 1,
                    rating: 1,
                    comment: 1,
                    createdAt: 1,
                    isVisible: 1
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json(reviews);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// 4. DELETE /api/admin/reviews/:reviewId - Soft delete review (Admin Only)
router.delete('/admin/reviews/:reviewId', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { reviewId } = req.params;
        const review = await Review.findByIdAndUpdate(
            reviewId,
            { isVisible: false },
            { new: true }
        );

        if (!review) {
            res.status(404).json({ error: 'Review not found' });
            return;
        }

        res.json({ message: 'Review hidden successfully', review });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
