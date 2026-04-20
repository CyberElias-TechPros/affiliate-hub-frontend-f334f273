const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db-mysql');

const AffiliateLink = sequelize.define('AffiliateLink', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  url: { type: DataTypes.STRING(500) },
  clicks: { type: DataTypes.INTEGER, defaultValue: 0 },
  conversions: { type: DataTypes.INTEGER, defaultValue: 0 },
  earnings: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
}, {
  tableName: 'affiliate_links',
});

module.exports = AffiliateLink;