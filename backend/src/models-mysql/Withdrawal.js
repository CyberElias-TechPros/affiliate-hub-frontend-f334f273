const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db-mysql');

const Withdrawal = sequelize.define('Withdrawal', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  method: { type: DataTypes.ENUM('bank', 'usdt', 'paypal'), allowNull: false },
  details: { type: DataTypes.JSON },
  status: { type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'), defaultValue: 'pending' },
}, {
  tableName: 'withdrawals',
});

module.exports = Withdrawal;