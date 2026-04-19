/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

const SAMPLE_PRODUCTS = [
  {
    title: 'Premium Forex Trading Course',
    description: 'Complete forex trading course for beginners to advanced traders.',
    price: 150000,
    commission: 45,
    category: 'Digital',
    image:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=600&fit=crop',
    whyPromote: ['High conversion rate', '30-day cookie', 'Recurring upsells'],
  },
  {
    title: 'Smart Fitness Watch Pro',
    description: 'Advanced fitness tracker with heart rate monitoring.',
    price: 45000,
    commission: 25,
    category: 'Tech',
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop',
  },
  {
    title: 'Organic Skincare Set',
    description: 'Complete organic skincare routine with natural ingredients.',
    price: 28000,
    commission: 30,
    category: 'Beauty',
    image:
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop',
  },
  {
    title: 'Crypto Mastermind Ebook',
    description: 'Step-by-step crypto investing playbook.',
    price: 12000,
    commission: 60,
    category: 'Digital',
    image:
      'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=600&fit=crop',
  },
  {
    title: 'Wireless Noise-Cancelling Headphones',
    description: 'Studio-grade audio with 40h battery.',
    price: 89000,
    commission: 18,
    category: 'Tech',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop',
  },
];

async function run() {
  await connectDB();

  console.log('Wiping existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Transaction.deleteMany({}),
  ]);

  console.log('Seeding users...');
  const demo = await User.create({
    name: 'Chinedu Nwankwo',
    email: 'demo@affiliatehub.com',
    password: 'password123',
    country: 'NG',
    onboardingComplete: true,
  });
  await User.create({
    name: 'Admin',
    email: 'admin@affiliatehub.com',
    password: 'admin1234',
    role: 'admin',
  });

  console.log('Seeding products...');
  await Product.insertMany(SAMPLE_PRODUCTS);

  console.log('Seeding transactions...');
  await Transaction.insertMany([
    {
      user: demo._id,
      type: 'commission',
      direction: 'credit',
      amount: 25000,
      status: 'completed',
      description: 'Commission - Forex Course',
    },
    {
      user: demo._id,
      type: 'commission',
      direction: 'credit',
      amount: 8400,
      status: 'completed',
      description: 'Commission - Skincare Set',
    },
    {
      user: demo._id,
      type: 'withdrawal',
      direction: 'debit',
      amount: 10000,
      status: 'pending',
      description: 'Withdrawal to bank',
    },
  ]);

  console.log('✅ Seed complete. Demo login: demo@affiliatehub.com / password123');
  await mongoose.connection.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
