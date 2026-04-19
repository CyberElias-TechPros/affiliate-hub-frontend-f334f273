const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const referralSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referred: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    code: { type: String, required: true, unique: true, default: () => nanoid(8) },
    status: { type: String, enum: ['pending', 'qualified', 'rewarded'], default: 'pending' },
    rewardAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Referral', referralSchema);
