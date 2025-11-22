const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { connectDB, disconnectDB } = require('./config/database');
const User = require('./models/User');

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');

    // Connect to MongoDB using centralized config
    await connectDB();
    console.log('🔗 Connected to MongoDB for seeding');

    // Check if admin user already exists
    const adminExists = await User.findOne({ email: 'admin@ricemill.com' });
    if (adminExists) {
      console.log('✅ Admin user already exists');
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const saltRounds = 10;
    const adminPassword = 'admin123';
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Create admin user
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@ricemill.com',
      passwordHash,
      role: 'admin',
      phone: '+94-123-456-7890',
      status: 'active',
    });

    await adminUser.save();
    console.log('🎉 Admin user created successfully!');
    console.log('📧 Email: admin@ricemill.com');
    console.log('🔐 Password: admin123');
    console.log('👤 Role: admin');

  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await disconnectDB();
    console.log('🔌 Database connection closed');
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Database seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
