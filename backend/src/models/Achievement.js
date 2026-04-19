const mongoose = require('mongoose');

// Catalog of achievements + per-user progress (denormalised for simplicity).
const achievementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    code: { type: String, required: true }, // e.g. 'first_sale', '10_sales', 'streak_7'
    title: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '🏆' },
    progress: { type: Number, default: 0 },
    target: { type: Number, default: 1 },
    unlockedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

achievementSchema.index({ user: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);
