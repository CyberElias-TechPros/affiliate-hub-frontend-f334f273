const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db-mysql');

const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('commission', 'withdrawal', 'bonus', 'refund', 'adjustment'), allowNull: false },
  direction: { type: DataTypes.ENUM('credit', 'debit'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'NGN' },
  status: { type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'), defaultValue: 'pending' },
  description: { type: DataTypes.STRING(255) },
  reference: { type: DataTypes.STRING(100) },
}, {
  tableName: 'transactions',
});

module.exports = Transaction;