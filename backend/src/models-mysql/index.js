const User = require('./User');
const Product = require('./Product');
const AffiliateLink = require('./AffiliateLink');
const Transaction = require('./Transaction');
const Withdrawal = require('./Withdrawal');
const Notification = require('./Notification');
const Achievement = require('./Achievement');
const Streak = require('./Streak');
const Referral = require('./Referral');

// Define associations
User.hasMany(AffiliateLink, { foreignKey: 'user_id', as: 'links' });
AffiliateLink.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Withdrawal, { foreignKey: 'user_id', as: 'withdrawals' });
Withdrawal.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Achievement, { foreignKey: 'user_id', as: 'achievements' });
Achievement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasOne(Streak, { foreignKey: 'user_id', as: 'streak' });
Streak.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Referral, { foreignKey: 'referrer_id', as: 'referrals' });
Referral.belongsTo(User, { foreignKey: 'referrer_id', as: 'referrer' });
Referral.belongsTo(User, { foreignKey: 'referred_id', as: 'referred' });

Product.hasMany(AffiliateLink, { foreignKey: 'product_id', as: 'links' });
AffiliateLink.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

module.exports = {
  User,
  Product,
  AffiliateLink,
  Transaction,
  Withdrawal,
  Notification,
  Achievement,
  Streak,
  Referral,
};