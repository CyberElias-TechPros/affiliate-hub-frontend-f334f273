const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db-mysql');

const Streak = sequelize.define('Streak', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  current: { type: DataTypes.INTEGER, defaultValue: 0 },
  longest: { type: DataTypes.INTEGER, defaultValue: 0 },
  last_active_date: { type: DataTypes.DATEONLY },
}, {
  tableName: 'streaks',
});

module.exports = Streak;