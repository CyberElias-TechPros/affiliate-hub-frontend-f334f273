const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db-mysql');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('sale', 'withdrawal', 'system', 'achievement', 'referral', 'click_milestone'), allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  icon: { type: DataTypes.STRING(50) },
  link: { type: DataTypes.STRING(255) },
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'notifications',
});

module.exports = Notification;