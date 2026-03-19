import express, { Request, Response } from 'express';
import Review from '../models/Review.js';
import { User } from '../models/User.js';
import { Cafe } from '../models/Cafe.js';
import { requireAdmin } from '../middleware/auth.js';
import { userAuth, AuthRequest } from '../middleware/userAuth.js';

const router = express.Router();

// 1. POST /api/cafes/:id/reviews - Add a review (Authenticated Only)
router.post('/cafes/:id/reviews', userAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { rating, comment } = req.body;
        const cafeId = req.params.id;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        if (comment && comment.length > 500) {
            return res.status(400).json({ error: 'Comment must be 500 characters or less' });
        }

        const anonymousId = user.name;

        const review = new Review({
            cafeId,
            userId: user._id,
            anonymousId,
            rating,
            comment,
            isVisible: true
        });

        await review.save();

        // Increment User reviewCount
        const userDoc = await User.findById(user._id);
        if (userDoc) {
            userDoc.reviewCount = (userDoc.reviewCount || 0) + 1;
            await userDoc.save();
        }

        // Update Cafe rating
        const cafe = await Cafe.findOne({ id: cafeId });
        if (cafe) {
            cafe.userRatingTotal += rating;
            cafe.userReviewCount += 1;
            
            const totalCount = cafe.googleReviewCount + cafe.userReviewCount;
            if (totalCount > 0) {
                cafe.displayRating = parseFloat(((cafe.googleRating * cafe.googleReviewCount + cafe.userRatingTotal) / totalCount).toFixed(1));
            }
            cafe.displayReviewCount = totalCount;
            
            await cafe.save();
        }

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

// 2.5 GET /api/user/reviews - Get reviews for the current user
router.get('/user/reviews', userAuth, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        const reviews = await Review.aggregate([
            { $match: { userId, isVisible: true } },
            {
                $lookup: {
                    from: 'cafes',
                    localField: 'cafeId',
                    foreignField: 'id',
                    as: 'cafeData'
                }
            },
            { $unwind: '$cafeData' },
            {
                $project: {
                    _id: 1,
                    rating: 1,
                    comment: 1,
                    createdAt: 1,
                    cafeName: '$cafeData.name',
                    cafeId: '$cafeData.id'
                }
            },
            { $sort: { createdAt: -1 } }
        ]);
        
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

        // Update Cafe rating
        const cafe = await Cafe.findOne({ id: review.cafeId });
        if (cafe) {
            cafe.userRatingTotal -= review.rating;
            cafe.userReviewCount -= 1;
            
            const totalCount = cafe.googleReviewCount + cafe.userReviewCount;
            if (totalCount > 0) {
                cafe.displayRating = parseFloat(((cafe.googleRating * cafe.googleReviewCount + cafe.userRatingTotal) / totalCount).toFixed(1));
            } else {
                cafe.displayRating = 0;
            }
            cafe.displayReviewCount = totalCount;
            
            await cafe.save();
        }

        res.json({ message: 'Review hidden successfully', review });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
