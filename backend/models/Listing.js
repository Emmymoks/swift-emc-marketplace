const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  type: { type: String, enum: ['item','service'], required: true },
  category: { type: String },
  images: [String],
  description: { type: String },
  price: { type: Number },
  currency: { type: String, default: 'USD' },
  location: { type: String },
  approved: { type: Boolean, default: false },
  premiumUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('Listing', ListingSchema);
