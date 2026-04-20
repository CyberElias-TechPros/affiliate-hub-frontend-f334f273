const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db-mysql');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  phone: { type: DataTypes.STRING(50) },
  whatsapp: { type: DataTypes.STRING(50) },
  country: { type: DataTypes.STRING(10), defaultValue: 'NG' },
  niche: { type: DataTypes.STRING(100) },
  avatar_url: { type: DataTypes.STRING(500) },
  role: { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user' },
  onboarding_complete: { type: DataTypes.BOOLEAN, defaultValue: false },
  provider: { type: DataTypes.ENUM('local', 'google', 'apple'), defaultValue: 'local' },
  referral_code: { type: DataTypes.STRING(20), unique: true },
  referred_by_id: { type: DataTypes.INTEGER, references: { model: 'Users', key: 'id' } },
  niches: { type: DataTypes.JSON },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) user.password = await bcrypt.hash(user.password, 10);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) user.password = await bcrypt.hash(user.password, 10);
    },
  },
});

User.prototype.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

User.prototype.toSafeJSON = function() {
  const { password, ...json } = this.toJSON();
  return json;
};

module.exports = User;