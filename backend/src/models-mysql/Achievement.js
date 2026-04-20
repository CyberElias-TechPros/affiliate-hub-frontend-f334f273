const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db-mysql');

const Achievement = sequelize.define('Achievement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  code: { type: DataTypes.STRING(50), allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  icon: { type: DataTypes.STRING(50) },
  target: { type: DataTypes.INTEGER, defaultValue: 0 },
  progress: { type: DataTypes.INTEGER, defaultValue: 0 },
  unlocked: { type: DataTypes.BOOLEAN, defaultValue: false },
  unlocked_at: { type: DataTypes.DATE },
}, {
  tableName: 'achievements',
});

module.exports = Achievement;