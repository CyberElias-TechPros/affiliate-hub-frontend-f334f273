const mongoose = require('mongoose');

const streakSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: '' }, // YYYY-MM-DD
  },
  { timestamps: true }
);

module.exports = mongoose.model('Streak', streakSchema);
