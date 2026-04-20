const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db-mysql');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'NGN' },
  commission: { type: DataTypes.INTEGER, defaultValue: 10 },
  category: { type: DataTypes.STRING(100) },
  tags: { type: DataTypes.JSON },
  image: { type: DataTypes.STRING(500) },
  gallery: { type: DataTypes.JSON },
  vendor: { type: DataTypes.STRING(255) },
  cookie_days: { type: DataTypes.INTEGER, defaultValue: 30 },
  why_promote: { type: DataTypes.JSON },
  swipe_copy: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'products',
});

module.exports = Product;