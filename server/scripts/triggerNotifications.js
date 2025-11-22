/**
 * Script to trigger test notifications
 * Usage: node server/scripts/triggerNotifications.js
 */

require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/database');
const { NotificationTriggers } = require('../utils/notifications');
const User = require('../models/User');

async function triggerTestNotifications() {
  try {
    // Connect to MongoDB using centralized config
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Get admin user
    const admin = await User.findOne({ email: 'admin@ricemill.com' });
    if (!admin) {
      console.error('❌ Admin user not found. Please run seed script first.');
      process.exit(1);
    }

    console.log('\n📧 Triggering Test Notifications...\n');

    // 1. Low Stock Alert
    console.log('1️⃣  Creating Low Stock Alert...');
    await NotificationTriggers.lowStockAlert('Basmati Rice', 15, 50);
    console.log('   ✅ Low stock alert created');

    // 2. New Order
    console.log('2️⃣  Creating New Order Notification...');
    await NotificationTriggers.newOrder('SO-2024-0001', 'Premium Foods Ltd');
    console.log('   ✅ New order notification created');

    // 3. Production Completed
    console.log('3️⃣  Creating Production Completed Notification...');
    await NotificationTriggers.productionCompleted('BATCH-2024-0001', 1600);
    console.log('   ✅ Production completed notification created');

    // 4. Purchase Received
    console.log('4️⃣  Creating Purchase Received Notification...');
    await NotificationTriggers.purchaseReceived('PO-2024-0001', 'ABC Suppliers');
    console.log('   ✅ Purchase received notification created');

    // 5. Invoice Generated
    console.log('5️⃣  Creating Invoice Generated Notification...');
    await NotificationTriggers.invoiceGenerated('INV-2024-0001', 'Premium Foods Ltd', 50000);
    console.log('   ✅ Invoice generated notification created');

    // 6. Payment Received
    console.log('6️⃣  Creating Payment Received Notification...');
    await NotificationTriggers.paymentReceived('INV-2024-0001', 50000, 'Premium Foods Ltd');
    console.log('   ✅ Payment received notification created');

    // 7. Delivery Dispatched
    console.log('7️⃣  Creating Delivery Dispatched Notification...');
    await NotificationTriggers.deliveryDispatched('SO-2024-0001', 'John Doe');
    console.log('   ✅ Delivery dispatched notification created');

    // 8. Maintenance Due
    console.log('8️⃣  Creating Maintenance Due Notification...');
    await NotificationTriggers.maintenanceDue('Rice Mill #1', 3);
    console.log('   ✅ Maintenance due notification created');

    // 9. Low Packaging Stock
    console.log('9️⃣  Creating Low Packaging Stock Notification...');
    await NotificationTriggers.lowPackagingStock('25kg Plastic Bags', 20, 50);
    console.log('   ✅ Low packaging stock notification created');

    // 10. Storage Bin Capacity Warning
    console.log('🔟 Creating Storage Bin Capacity Warning...');
    await NotificationTriggers.storageBinCapacityWarning('Warehouse A - Bin 1', 85);
    console.log('   ✅ Storage bin capacity warning created');

    // 11. Direct notification to admin
    console.log('\n1️⃣1️⃣  Creating Direct Notification to Admin...');
    const { createNotification } = require('../utils/notifications');
    await createNotification(admin._id, {
      title: 'System Test Notification',
      message: 'This is a test notification to verify the notification system is working correctly.',
      type: 'info',
      link: '/dashboard'
    });
    console.log('   ✅ Direct notification to admin created');

    console.log('\n✅ All test notifications created successfully!');
    console.log('\n📱 Check the notification panel in the frontend to see the notifications.');

  } catch (error) {
    console.error('❌ Error triggering notifications:', error);
  } finally {
    await disconnectDB();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  triggerTestNotifications();
}

module.exports = triggerTestNotifications;

