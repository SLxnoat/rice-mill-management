const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGODB_URI = 'mongodb://localhost:27017/rice-mill-erp';

const demoUsers = [
    {
        name: 'Admin User',
        email: 'admin@ricemill.com',
        password: 'admin123',
        role: 'admin',
        status: 'active',
    },
    {
        name: 'Manager User',
        email: 'manager@ricemill.com',
        password: 'manager123',
        role: 'sales_manager',
        status: 'active',
    },
    {
        name: 'Accountant User',
        email: 'accountant@ricemill.com',
        password: 'accountant123',
        role: 'accountant',
        status: 'active',
    },
    {
        name: 'Operator User',
        email: 'operator@ricemill.com',
        password: 'operator123',
        role: 'operator',
        status: 'active',
    },
];

async function seedUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing demo users
        await User.deleteMany({ email: { $in: demoUsers.map(u => u.email) } });
        console.log('🗑️  Cleared existing demo users');

        // Create demo users
        for (const userData of demoUsers) {
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            const user = await User.create({
                name: userData.name,
                email: userData.email,
                passwordHash: hashedPassword,
                role: userData.role,
                status: userData.status,
            });

            console.log(`✅ Created: ${user.email} (${user.role})`);
        }

        console.log('\n🎉 Demo users created successfully!\n');
        console.log('📋 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        demoUsers.forEach(u => {
            console.log(`${u.role.toUpperCase().padEnd(15)} | ${u.email.padEnd(30)} | ${u.password}`);
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding users:', error);
        process.exit(1);
    }
}

seedUsers();
