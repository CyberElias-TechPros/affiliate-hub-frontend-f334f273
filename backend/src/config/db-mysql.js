const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  database: process.env.MYSQL_DATABASE || 'affiliate_hub',
  username: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
});

async function connectMySQL() {
  try {
    await sequelize.authenticate();
    console.log(`✅ MySQL connected: ${process.env.MYSQL_HOST}/${process.env.MYSQL_DATABASE}`);
    
    // Sync models (use sync: true for development only, false for production)
    const sync = process.env.MYSQL_SYNC === 'true';
    if (sync) {
      await sequelize.sync({ alter: true });
      console.log('✅ MySQL tables synchronized');
    }
  } catch (err) {
    console.error('MySQL connection error:', err.message);
    throw err;
  }
}

module.exports = { sequelize, connectMySQL };