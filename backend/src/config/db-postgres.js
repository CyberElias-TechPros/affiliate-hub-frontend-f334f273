const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DATABASE || 'affiliate_hub',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const pool.query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
  return res;
};

async function connectPostgres() {
  const client = await pool.connect();
  try {
    // Create tables if they don't exist
    await createTables(client);
    console.log(`✅ PostgreSQL connected: ${process.env.POSTGRES_HOST}/${process.env.POSTGRES_DATABASE}`);
  } catch (err) {
    console.error('PostgreSQL connection error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function createTables(client) {
  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      whatsapp VARCHAR(50),
      country VARCHAR(10) DEFAULT 'NG',
      niche VARCHAR(100),
      niches JSONB DEFAULT '[]',
      avatar_url VARCHAR(500),
      role VARCHAR(20) DEFAULT 'affiliate',
      onboarding_complete BOOLEAN DEFAULT FALSE,
      provider VARCHAR(20) DEFAULT 'local',
      referral_code VARCHAR(20) UNIQUE,
      referred_by_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(12,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'NGN',
      commission INTEGER DEFAULT 10,
      category VARCHAR(100),
      tags JSONB DEFAULT '[]',
      image VARCHAR(500),
      gallery JSONB DEFAULT '[]',
      vendor VARCHAR(255),
      cookie_days INTEGER DEFAULT 30,
      why_promote JSONB DEFAULT '[]',
      swipe_copy TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Affiliate links table
    CREATE TABLE IF NOT EXISTS affiliate_links (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      code VARCHAR(20) UNIQUE NOT NULL,
      url VARCHAR(500),
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      earnings DECIMAL(12,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    );

    -- Transactions table
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      direction VARCHAR(10) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'NGN',
      status VARCHAR(20) DEFAULT 'pending',
      description VARCHAR(255),
      reference VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Withdrawals table
    CREATE TABLE IF NOT EXISTS withdrawals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(12,2) NOT NULL,
      method VARCHAR(20) NOT NULL,
      details JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(30) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      icon VARCHAR(50),
      link VARCHAR(255),
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Achievements table
    CREATE TABLE IF NOT EXISTS achievements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      code VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      target INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0,
      unlocked BOOLEAN DEFAULT FALSE,
      unlocked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, code)
    );

    -- Streaks table
    CREATE TABLE IF NOT EXISTS streaks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      current INTEGER DEFAULT 0,
      longest INTEGER DEFAULT 0,
      last_active_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Referrals table
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      referred_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending',
      reward_amount DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(referrer_id, referred_id)
    );

    -- Sync log table for tracking cross-database sync
    CREATE TABLE IF NOT EXISTS sync_logs (
      id SERIAL PRIMARY KEY,
      entity VARCHAR(50) NOT NULL,
      entity_id INTEGER NOT NULL,
      source_db VARCHAR(20) NOT NULL,
      synced_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(entity, entity_id, source_db)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_affiliate_links_user ON affiliate_links(user_id);
    CREATE INDEX IF NOT EXISTS idx_affiliate_links_product ON affiliate_links(product_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `;
  
  await client.query(schema);
  console.log('✅ PostgreSQL tables created/verified');
}

module.exports = { pool, query: pool.query, connectPostgres };