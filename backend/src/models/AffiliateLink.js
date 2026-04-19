const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const affiliateLinkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    code: { type: String, required: true, unique: true, default: () => nanoid(10) },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

affiliateLinkSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('AffiliateLink', affiliateLinkSchema);
