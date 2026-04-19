const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'NGN' },
    commission: { type: Number, required: true, min: 0, max: 100 },
    category: { type: String, index: true, default: 'General' },
    tags: [{ type: String }],
    image: { type: String, default: '' },
    gallery: [{ type: String }],
    vendor: { type: String, default: 'Affiliate Hub' },
    cookieDays: { type: Number, default: 30 },
    whyPromote: [{ type: String }],
    swipeCopy: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text', tags: 'text' });

productSchema.virtual('commissionAmount').get(function () {
  return Math.round(this.price * (this.commission / 100));
});

productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
