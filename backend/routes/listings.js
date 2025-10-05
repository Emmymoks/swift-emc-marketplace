const express = require('express');
const Listing = require('../models/Listing');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

async function getUserFromHeader(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  try {
    const token = auth.replace('Bearer ', '');
    const data = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    return await User.findById(data.id);
  } catch {
    return null;
  }
}

// Create listing (pending approval)
router.post('/', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { title, type, category, images, description, price, currency, location } =
      req.body;

    const listing = new Listing({
      owner: user._id,
      title,
      type,
      category,
      images,
      description,
      price,
      currency: currency || user.currency,
      location,
      approved: false,
    });
    await listing.save();
    res.json({ ok: true, listing });
  } catch (err) {
    console.error('Create listing error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get public listings (approved)
router.get('/', async (req, res) => {
  try {
    const { q, category, type } = req.query;
    const filter = { approved: true };
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (q) filter.$text = { $search: q };

    const listings = await Listing.find(filter)
      .sort({ premiumUntil: -1, createdAt: -1 })
      .limit(200)
      .populate('owner', 'username profilePhotoUrl location');

    res.json({ listings });
  } catch (err) {
    console.error('Get listings error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single listing
router.get('/:id', async (req, res) => {
  try {
    const l = await Listing.findById(req.params.id).populate(
      'owner',
      'username profilePhotoUrl location'
    );
    if (!l) return res.status(404).json({ error: 'Not found' });
    if (!l.approved) return res.status(403).json({ error: 'Listing not yet approved' });
    res.json({ listing: l });
  } catch (err) {
    console.error('Get listing error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add review
router.post('/:id/review', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { rating, comment } = req.body;
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Not found' });

    listing.reviews.push({ user: user._id, rating, comment });
    await listing.save();
    res.json({ ok: true, listing });
  } catch (err) {
    console.error('Review error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
