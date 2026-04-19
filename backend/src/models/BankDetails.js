const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    bankName: { type: String, default: '' },
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    usdtAddress: { type: String, default: '' },
    paypalEmail: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BankDetails', bankDetailsSchema);
