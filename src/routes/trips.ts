import express from 'express';
import { Trip } from '../models/Trip.js';
import { userAuth, optionalUser, AuthRequest } from '../middleware/userAuth.js';
import mongoose from 'mongoose';

export const tripsRouter = express.Router();

// ─── Create Trip ────────────────────────────────────────────
tripsRouter.post('/', userAuth, async (req: AuthRequest, res) => {
  try {
    const { title, eventDate, cafeId, cafeName, pollCafeOptions } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({ message: 'Title and event date are required' });
    }

    const tripData: any = {
      creatorId: req.user!._id,
      title,
      eventDate: new Date(eventDate),
      participants: [{
        userId: req.user!._id,
        name: req.user!.name,
        rsvpStatus: 'going'
      }]
    };

    // If poll options provided (2-3 cafes), create a poll
    if (pollCafeOptions && Array.isArray(pollCafeOptions) && pollCafeOptions.length >= 2) {
      tripData.status = 'planning';
      tripData.poll = {
        options: pollCafeOptions.map((opt: { cafeId: string; cafeName: string }) => ({
          cafeId: opt.cafeId,
          cafeName: opt.cafeName,
          votes: []
        })),
        resolved: false
      };
    } else if (cafeId && cafeName) {
      // Single cafe selected — confirmed
      tripData.selectedCafeId = cafeId;
      tripData.selectedCafeName = cafeName;
      tripData.status = 'confirmed';
    } else {
      return res.status(400).json({ message: 'Either a cafe or poll options are required' });
    }

    const trip = new Trip(tripData);
    await trip.save();

    res.status(201).json(trip);
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ message: 'Error creating trip' });
  }
});

// ─── List My Trips ──────────────────────────────────────────
tripsRouter.get('/', userAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!._id;

    const trips = await Trip.find({
      $or: [
        { creatorId: userId },
        { 'participants.userId': userId }
      ]
    }).sort({ eventDate: -1 }).lean();

    const now = new Date();
    const upcoming = trips.filter(t => new Date(t.eventDate) >= now && t.status !== 'cancelled');
    const past = trips.filter(t => new Date(t.eventDate) < now || t.status === 'cancelled');

    res.json({ upcoming, past });
  } catch (error) {
    console.error('List trips error:', error);
    res.status(500).json({ message: 'Error fetching trips' });
  }
});

// ─── Get Trip by Shareable Code (public) ────────────────────
tripsRouter.get('/invite/:code', optionalUser, async (req: AuthRequest, res) => {
  try {
    const trip = await Trip.findOne({ shareableCode: req.params.code }).lean();
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.json({
      trip,
      isAuthenticated: !!req.user,
      currentUserId: req.user?._id?.toString() || null
    });
  } catch (error) {
    console.error('Fetch trip by code error:', error);
    res.status(500).json({ message: 'Error fetching trip' });
  }
});

// ─── Get Single Trip ────────────────────────────────────────
tripsRouter.get('/:tripId', userAuth, async (req: AuthRequest, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId).lean();
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.json(trip);
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ message: 'Error fetching trip' });
  }
});

// ─── RSVP ───────────────────────────────────────────────────
tripsRouter.post('/:tripId/rsvp', userAuth, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!['going', 'maybe', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid RSVP status' });
    }

    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const userId = req.user!._id;
    const existingIdx = trip.participants.findIndex(
      p => p.userId.toString() === userId.toString()
    );

    if (existingIdx >= 0) {
      trip.participants[existingIdx].rsvpStatus = status;
    } else {
      trip.participants.push({
        userId,
        name: req.user!.name,
        rsvpStatus: status
      });
    }

    await trip.save();
    res.json(trip);
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ message: 'Error saving RSVP' });
  }
});

// ─── Vote on Poll ───────────────────────────────────────────
tripsRouter.post('/:tripId/vote', userAuth, async (req: AuthRequest, res) => {
  try {
    const { cafeId } = req.body;
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (!trip.poll || trip.poll.resolved) {
      return res.status(400).json({ message: 'No active poll on this trip' });
    }

    const userId = req.user!._id;

    // Remove any previous vote from this user
    for (const opt of trip.poll.options) {
      opt.votes = opt.votes.filter(v => v.toString() !== userId.toString()) as any;
    }

    // Add new vote
    const option = trip.poll.options.find(o => o.cafeId === cafeId);
    if (!option) {
      return res.status(400).json({ message: 'Invalid cafe option' });
    }
    option.votes.push(userId);

    // Auto-add as participant if not present
    const isParticipant = trip.participants.some(
      p => p.userId.toString() === userId.toString()
    );
    if (!isParticipant) {
      trip.participants.push({
        userId,
        name: req.user!.name,
        rsvpStatus: 'going'
      });
    }

    // Check if we should auto-resolve (all participants with 'going' have voted)
    const goingParticipants = trip.participants.filter(p => p.rsvpStatus === 'going');
    const totalVotes = trip.poll.options.reduce((sum, o) => sum + o.votes.length, 0);

    if (goingParticipants.length > 1 && totalVotes >= goingParticipants.length) {
      // Resolve — pick the option with the most votes
      const winner = trip.poll.options.reduce((best, opt) =>
        opt.votes.length > best.votes.length ? opt : best
      );
      trip.poll.resolved = true;
      trip.selectedCafeId = winner.cafeId;
      trip.selectedCafeName = winner.cafeName;
      trip.status = 'confirmed';
    }

    await trip.save();
    res.json(trip);
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Error casting vote' });
  }
});

// ─── Update Trip (creator only) ─────────────────────────────
tripsRouter.patch('/:tripId', userAuth, async (req: AuthRequest, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.creatorId.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ message: 'Only the creator can update this trip' });
    }

    const { title, eventDate, status } = req.body;
    if (title) trip.title = title;
    if (eventDate) trip.eventDate = new Date(eventDate);
    if (status && ['planning', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      trip.status = status;
    }

    await trip.save();
    res.json(trip);
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ message: 'Error updating trip' });
  }
});

// ─── Delete Trip (creator only) ─────────────────────────────
tripsRouter.delete('/:tripId', userAuth, async (req: AuthRequest, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.creatorId.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ message: 'Only the creator can delete this trip' });
    }

    await Trip.findByIdAndDelete(req.params.tripId);
    res.json({ message: 'Trip deleted' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ message: 'Error deleting trip' });
  }
});
