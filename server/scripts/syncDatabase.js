/**
 * Database Sync Script
 * Links and syncs all components with the database
 * Usage: node server/scripts/syncDatabase.js
 */

require('dotenv').config();
const { connectDB, disconnectDB, syncIndexes, verifyDatabase, loadAllModels } = require('../config/database');
const { initializeAutoNumbering } = require('../utils/autoNumbering');

async function syncDatabase() {
  try {
    console.log('🔄 Starting database sync...\n');

    // Step 1: Connect to database
    console.log('1️⃣  Connecting to database...');
    await connectDB();
    console.log('   ✅ Connected\n');

    // Step 2: Load all models
    console.log('2️⃣  Loading all models...');
    loadAllModels();
    console.log('   ✅ Models loaded\n');

    // Step 3: Sync indexes
    console.log('3️⃣  Syncing database indexes...');
    await syncIndexes();
    console.log('   ✅ Indexes synced\n');

    // Step 4: Initialize auto-numbering
    console.log('4️⃣  Initializing auto-numbering settings...');
    await initializeAutoNumbering();
    console.log('   ✅ Auto-numbering initialized\n');

    // Step 5: Verify database
    console.log('5️⃣  Verifying database connection...');
    const verified = await verifyDatabase();
    if (!verified) {
      throw new Error('Database verification failed');
    }
    console.log('   ✅ Database verified\n');

    // Step 6: Display model information
    console.log('6️⃣  Model Information:');
    const mongoose = require('mongoose');
    const models = mongoose.connection.models;
    const modelNames = Object.keys(models).sort();
    
    console.log(`   Total models: ${modelNames.length}`);
    modelNames.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    console.log('');

    // Step 7: Display collection information
    console.log('7️⃣  Collection Information:');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`   Total collections: ${collections.length}`);
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   - ${collection.name}: ${count} documents`);
    }
    console.log('');

    console.log('✅ Database sync completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Models: ${modelNames.length}`);
    console.log(`   - Collections: ${collections.length}`);
    console.log(`   - Database: ${mongoose.connection.name}`);
    console.log(`   - Connection: ${mongoose.connection.readyState === 1 ? 'Active' : 'Inactive'}`);

  } catch (error) {
    console.error('❌ Database sync failed:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

// Run the sync
if (require.main === module) {
  syncDatabase();
}

module.exports = syncDatabase;

