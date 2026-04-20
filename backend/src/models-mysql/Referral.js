const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db-mysql');

const Referral = sequelize.define('Referral', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  referrer_id: { type: DataTypes.INTEGER, allowNull: false },
  referred_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'qualified', 'rewarded'), defaultValue: 'pending' },
  reward_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
}, {
  tableName: 'referrals',
});

module.exports = Referral;