const mongoose = require('mongoose');

const posterSchema = new mongoose.Schema({
  posterName: {
    type: String,
    required: true,
    trim: true
  },

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
    required: false
  },

  imageUrl: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const Poster = mongoose.model('Poster', posterSchema);

module.exports = Poster;
