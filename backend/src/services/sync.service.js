/**
 * Multi-Database Sync Service
 * 
 * Provides real-time synchronization between MongoDB, MySQL, and PostgreSQL.
 * Uses "last-write-wins" strategy based on timestamps for conflict resolution.
 * 
 * All writes go to the primary DB first (MongoDB by default).
 * Secondary databases are updated asynchronously.
 */

const { sequelize } = require('../models-mysql');
const { query: mysqlQuery } = require('./mysql-helper');

const SYNC_CONFIG = {
  // Enable/disable sync for each database
  enableMySQL: process.env.SYNC_MYSQL === 'true',
  enablePostgres: process.env.SYNC_POSTGRES === 'true',
  
  // Primary database (where all writes go first)
  primaryDb: process.env.PRIMARY_DB || 'mongodb',
  
  // Sync settings
  batchSize: parseInt(process.env.SYNC_BATCH_SIZE) || 100,
  syncInterval: parseInt(process.env.SYNC_INTERVAL) || 60000, // 1 minute
};

/**
 * Initialize sync service
 */
async function initSyncService() {
  console.log('🔄 Initializing sync service...');
  console.log(`   Primary DB: ${SYNC_CONFIG.primaryDb}`);
  console.log(`   MySQL Sync: ${SYNC_CONFIG.enableMySQL}`);
  console.log(`   Postgres Sync: ${SYNC_CONFIG.enablePostgres}`);
  
  // Start background sync if any secondary DB is enabled
  if (SYNC_CONFIG.enableMySQL || SYNC_CONFIG.enablePostgres) {
    startBackgroundSync();
  }
}

/**
 * Start background sync process
 */
let syncInterval = null;
function startBackgroundSync() {
  if (syncInterval) return;
  
  console.log(`🔄 Starting background sync every ${SYNC_CONFIG.syncInterval/1000}s`);
  
  syncInterval = setInterval(async () => {
    try {
      await syncAll();
    } catch (err) {
      console.error('Sync error:', err.message);
    }
  }, SYNC_CONFIG.syncInterval);
}

/**
 * Stop background sync
 */
function stopSyncService() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

/**
 * Sync all entities across databases
 */
async function syncAll() {
  if (!SYNC_CONFIG.enableMySQL && !SYNC_CONFIG.enablePostgres) return;
  
  console.log('🔄 Syncing all entities...');
  
  // Sync each entity type
  await syncUsers();
  await syncProducts();
  await syncAffiliateLinks();
  await syncTransactions();
  await syncWithdrawals();
  await syncNotifications();
  
  console.log('✅ Sync complete');
}

/**
 * Sync Users
 */
async function syncUsers() {
  try {
    let users;
    
    // Get users from primary DB
    if (SYNC_CONFIG.primaryDb === 'mongodb') {
      const User = require('../models/User');
      users = await User.find().lean().exec();
    } else {
      // MySQL or fallback
      return;
    }
    
    for (const user of users) {
      await syncToMySQL('users', user);
      await syncToPostgres('users', user);
    }
  } catch (err) {
    console.error('User sync error:', err.message);
  }
}

/**
 * Sync Products
 */
async function syncProducts() {
  try {
    let products;
    
    if (SYNC_CONFIG.primaryDb === 'mongodb') {
      const Product = require('../models/Product');
      products = await Product.find().lean().exec();
    } else {
      return;
    }
    
    for (const product of products) {
      await syncToMySQL('products', product);
      await syncToPostgres('products', product);
    }
  } catch (err) {
    console.error('Product sync error:', err.message);
  }
}

/**
 * Sync Affiliate Links
 */
async function syncAffiliateLinks() {
  try {
    let links;
    
    if (SYNC_CONFIG.primaryDb === 'mongodb') {
      const AffiliateLink = require('../models/AffiliateLink');
      links = await AffiliateLink.find().populate('user product').lean().exec();
    } else {
      return;
    }
    
    for (const link of links) {
      await syncToMySQL('affiliate_links', link);
      await syncToPostgres('affiliate_links', link);
    }
  } catch (err) {
    console.error('AffiliateLink sync error:', err.message);
  }
}

/**
 * Sync Transactions
 */
async function syncTransactions() {
  try {
    let transactions;
    
    if (SYNC_CONFIG.primaryDb === 'mongodb') {
      const Transaction = require('../models/Transaction');
      transactions = await Transaction.find().lean().exec();
    } else {
      return;
    }
    
    for (const tx of transactions) {
      await syncToMySQL('transactions', tx);
      await syncToPostgres('transactions', tx);
    }
  } catch (err) {
    console.error('Transaction sync error:', err.message);
  }
}

/**
 * Sync Withdrawals
 */
async function syncWithdrawals() {
  try {
    let withdrawals;
    
    if (SYNC_CONFIG.primaryDb === 'mongodb') {
      const Withdrawal = require('../models/Withdrawal');
      withdrawals = await Withdrawal.find().lean().exec();
    } else {
      return;
    }
    
    for (const w of withdrawals) {
      await syncToMySQL('withdrawals', w);
      await syncToPostgres('withdrawals', w);
    }
  } catch (err) {
    console.error('Withdrawal sync error:', err.message);
  }
}

/**
 * Sync Notifications
 */
async function syncNotifications() {
  try {
    let notifications;
    
    if (SYNC_CONFIG.primaryDb === 'mongodb') {
      const Notification = require('../models/Notification');
      notifications = await Notification.find().lean().exec();
    } else {
      return;
    }
    
    for (const n of notifications) {
      await syncToMySQL('notifications', n);
      await syncToPostgres('notifications', n);
    }
  } catch (err) {
    console.error('Notification sync error:', err.message);
  }
}

/**
 * Sync to MySQL using Sequelize bulk upsert
 */
async function syncToMySQL(table, data) {
  if (!SYNC_CONFIG.enableMySQL) return;
  
  try {
    const model = sequelize.models[table.charAt(0).toUpperCase() + table.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
    if (!model) return;
    
    // Check if record exists
    const existing = await model.findByPk(data._id);
    if (existing) {
      // Compare timestamps, update if newer
      const existingUpdated = existing.updatedAt?.getTime() || 0;
      const dataUpdated = new Date(data.updatedAt || data.createdAt).getTime();
      if (dataUpdated > existingUpdated) {
        await model.update(data, { where: { id: data._id } });
      }
    } else {
      await model.create(data);
    }
  } catch (err) {
    // Ignore duplicate key errors
    if (!err.message.includes('unique')) {
      console.error(`MySQL sync error for ${table}:`, err.message);
    }
  }
}

/**
 * Sync to PostgreSQL
 */
async function syncToPostgres(table, data) {
  if (!SYNC_CONFIG.enablePostgres) return;
  
  try {
    const { pool } = require('../config/db-postgres');
    
    // Build upsert query
    const { query, buildUpsertQuery } = getPgQueries(table, data);
    await pool.query(query.text, query.values);
  } catch (err) {
    console.error(`Postgres sync error for ${table}:`, err.message);
  }
}

/**
 * Build PostgreSQL upsert queries for each table
 */
function getPgQueries(table, data) {
  const queries = {
    users: {
      text: `
        INSERT INTO users (id, name, email, password, phone, whatsapp, country, niche, niches, avatar_url, role, onboarding_complete, provider, referral_code, referred_by_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          phone = EXCLUDED.phone,
          whatsapp = EXCLUDED.whatsapp,
          country = EXCLUDED.country,
          niche = EXCLUDED.niche,
          niches = EXCLUDED.niches,
          avatar_url = EXCLUDED.avatar_url,
          role = EXCLUDED.role,
          onboarding_complete = EXCLUDED.onboarding_complete,
          provider = EXCLUDED.provider,
          referral_code = EXCLUDED.referral_code,
          referred_by_id = EXCLUDED.referred_by_id,
          updated_at = GREATEST(users.updated_at, EXCLUDED.updated_at)
        WHERE users.updated_at < EXCLUDED.updated_at
      `,
      values: [
        data._id, data.name, data.email, data.password, data.phone, data.whatsapp,
        data.country, data.niche, JSON.stringify(data.niches || []), data.avatarUrl,
        data.role, data.onboardingComplete, data.provider, data.referralCode, data.referredById,
        data.createdAt, data.updatedAt
      ]
    },
    products: {
      text: `
        INSERT INTO products (id, title, description, price, currency, commission, category, tags, image, gallery, vendor, cookie_days, why_promote, swipe_copy, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          currency = EXCLUDED.currency,
          commission = EXCLUDED.commission,
          category = EXCLUDED.category,
          tags = EXCLUDED.tags,
          image = EXCLUDED.image,
          gallery = EXCLUDED.gallery,
          vendor = EXCLUDED.vendor,
          cookie_days = EXCLUDED.cookie_days,
          why_promote = EXCLUDED.why_promote,
          swipe_copy = EXCLUDED.swipe_copy,
          is_active = EXCLUDED.is_active,
          updated_at = GREATEST(products.updated_at, EXCLUDED.updated_at)
        WHERE products.updated_at < EXCLUDED.updated_at
      `,
      values: [
        data._id, data.title, data.description, data.price, data.currency,
        data.commission, data.category, JSON.stringify(data.tags || []), data.image,
        JSON.stringify(data.gallery || []), data.vendor, data.cookieDays,
        JSON.stringify(data.whyPromote || []), data.swipeCopy, data.isActive,
        data.createdAt, data.updatedAt
      ]
    }
  };
  
  return queries[table] || { text: 'SELECT 1', values: [] };
}

/**
 * Sync a single record change to all databases
 */
async function syncRecord(entity, id, data) {
  if (SYNC_CONFIG.enableMySQL && sequelize) {
    await syncToMySQL(entity, data);
  }
  if (SYNC_CONFIG.enablePostgres) {
    await syncToPostgres(entity, data);
  }
}

/**
 * Get sync status
 */
function getSyncStatus() {
  return {
    primaryDb: SYNC_CONFIG.primaryDb,
    mySqlEnabled: SYNC_CONFIG.enableMySQL,
    postgresEnabled: SYNC_CONFIG.enablePostgres,
    isRunning: !!syncInterval,
  };
}

module.exports = {
  initSyncService,
  stopSyncService,
  syncAll,
  syncRecord,
  getSyncStatus,
  SYNC_CONFIG,
};