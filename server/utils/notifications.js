/**
 * Notification Utility - Linked to Database
 * All notifications are saved to MongoDB Notification collection
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');

// Ensure database connection before creating notifications
const ensureDBConnection = async () => {
  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️ Database not connected, notifications may fail');
  }
};

/**
 * Create a notification for a user
 * @param {String|ObjectId} userId - User ID
 * @param {Object} data - Notification data
 * @param {String} data.title - Notification title
 * @param {String} data.message - Notification message
 * @param {String} data.type - Notification type (info, success, warning, error)
 * @param {String} data.link - Optional link to navigate
 * @param {Object} data.metadata - Optional metadata
 */
async function createNotification(userId, data) {
  try {
    // Ensure database connection
    await ensureDBConnection();

    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID for notification');
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Create notification in database
    const notification = await Notification.createNotification(userId, {
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      link: data.link || null,
      metadata: data.metadata || {}
    });

    console.log(`✅ Notification created for user ${user.name}: ${data.title}`);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notifications for multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {Object} data - Notification data
 */
async function createNotificationsForUsers(userIds, data) {
  try {
    const notifications = await Promise.all(
      userIds.map(userId => createNotification(userId, data))
    );
    return notifications;
  } catch (error) {
    console.error('Error creating notifications for users:', error);
    throw error;
  }
}

/**
 * Create notification for all users with a specific role
 * @param {String} role - User role
 * @param {Object} data - Notification data
 */
async function createNotificationForRole(role, data) {
  try {
    const users = await User.find({ role, status: 'active' });
    const userIds = users.map(u => u._id);
    return await createNotificationsForUsers(userIds, data);
  } catch (error) {
    console.error('Error creating notification for role:', error);
    throw error;
  }
}

/**
 * Create notification for admin users
 * @param {Object} data - Notification data
 */
async function notifyAdmins(data) {
  return await createNotificationForRole('admin', data);
}

/**
 * Notification triggers for common events
 */
const NotificationTriggers = {
  /**
   * Low stock alert
   */
  async lowStockAlert(productName, currentStock, reorderLevel, userId = null) {
    const data = {
      title: 'Low Stock Alert',
      message: `${productName} stock is running low (${currentStock} remaining). Reorder level: ${reorderLevel}`,
      type: 'warning',
      link: '/inventory',
      metadata: { productName, currentStock, reorderLevel }
    };

    if (userId) {
      return await createNotification(userId, data);
    } else {
      // Notify warehouse managers and admins
      const users = await User.find({
        role: { $in: ['admin', 'warehouse_manager'] },
        status: 'active'
      });
      const userIds = users.map(u => u._id);
      return await createNotificationsForUsers(userIds, data);
    }
  },

  /**
   * New order received
   */
  async newOrder(orderNumber, customerName, userId = null) {
    const data = {
      title: 'New Order Received',
      message: `Order ${orderNumber} has been placed by ${customerName}`,
      type: 'info',
      link: '/sales',
      metadata: { orderNumber, customerName }
    };

    if (userId) {
      return await createNotification(userId, data);
    } else {
      // Notify sales managers and admins
      return await createNotificationForRole('sales_manager', data);
    }
  },

  /**
   * Production batch completed
   */
  async productionCompleted(batchNumber, yieldAmount, userId = null) {
    const data = {
      title: 'Production Completed',
      message: `Batch ${batchNumber} has been completed successfully. Yield: ${yieldAmount}kg`,
      type: 'success',
      link: '/production',
      metadata: { batchNumber, yieldAmount }
    };

    if (userId) {
      return await createNotification(userId, data);
    } else {
      // Notify operators and admins
      const users = await User.find({
        role: { $in: ['admin', 'operator'] },
        status: 'active'
      });
      const userIds = users.map(u => u._id);
      return await createNotificationsForUsers(userIds, data);
    }
  },

  /**
   * Purchase order received
   */
  async purchaseReceived(poNumber, supplierName, userId = null) {
    const data = {
      title: 'Purchase Order Received',
      message: `PO ${poNumber} from ${supplierName} has been received`,
      type: 'success',
      link: '/procurement',
      metadata: { poNumber, supplierName }
    };

    if (userId) {
      return await createNotification(userId, data);
    } else {
      // Notify warehouse managers and admins
      return await createNotificationForRole('warehouse_manager', data);
    }
  },

  /**
   * Invoice generated
   */
  async invoiceGenerated(invoiceNumber, customerName, amount, userId = null) {
    const data = {
      title: 'Invoice Generated',
      message: `Invoice ${invoiceNumber} for ${customerName} - Rs. ${amount.toLocaleString()}`,
      type: 'success',
      link: '/sales',
      metadata: { invoiceNumber, customerName, amount }
    };

    if (userId) {
      return await createNotification(userId, data);
    } else {
      // Notify accountants and admins
      const users = await User.find({
        role: { $in: ['admin', 'accountant'] },
        status: 'active'
      });
      const userIds = users.map(u => u._id);
      return await createNotificationsForUsers(userIds, data);
    }
  },

  /**
   * Payment received
   */
  async paymentReceived(invoiceNumber, amount, customerName, userId = null) {
    const data = {
      title: 'Payment Received',
      message: `Payment of Rs. ${amount.toLocaleString()} received for Invoice ${invoiceNumber} from ${customerName}`,
      type: 'success',
      link: '/accounting',
      metadata: { invoiceNumber, amount, customerName }
    };

    if (userId) {
      return await createNotification(userId, data);
    } else {
      // Notify accountants and admins
      return await createNotificationForRole('accountant', data);
    }
  },

  /**
   * Delivery dispatched
   */
  async deliveryDispatched(orderNumber, driverName, userId = null) {
    const data = {
      title: 'Delivery Dispatched',
      message: `Order ${orderNumber} has been dispatched with driver ${driverName}`,
      type: 'info',
      link: '/sales',
      metadata: { orderNumber, driverName }
    };

    if (userId) {
      return await createNotification(userId, data);
    } else {
      // Notify sales managers
      return await createNotificationForRole('sales_manager', data);
    }
  },

  /**
   * Machine maintenance due
   */
  async maintenanceDue(machineName, daysUntilDue, userId = null) {
    const data = {
      title: 'Maintenance Due',
      message: `Machine ${machineName} requires maintenance in ${daysUntilDue} day(s)`,
      type: 'warning',
      link: '/maintenance',
      metadata: { machineName, daysUntilDue }
    };

    if (userId) {
      return await createNotification(userId, data);
    } else {
      // Notify admins
      return await notifyAdmins(data);
    }
  },

  /**
   * Low packaging stock
   */
  async lowPackagingStock(packagingName, currentStock, reorderLevel, userId = null) {
    const data = {
      title: 'Low Packaging Stock',
      message: `${packagingName} stock is running low (${currentStock} remaining). Reorder level: ${reorderLevel}`,
      type: 'warning',
      link: '/packaging',
      metadata: { packagingName, currentStock, reorderLevel }
    };

    if (userId) {
      return await createNotification(userId, data);
    } else {
      // Notify warehouse managers and admins
      const users = await User.find({
        role: { $in: ['admin', 'warehouse_manager'] },
        status: 'active'
      });
      const userIds = users.map(u => u._id);
      return await createNotificationsForUsers(userIds, data);
    }
  },

  /**
   * Storage bin capacity warning
   */
  async storageBinCapacityWarning(binName, utilizationPercent, userId = null) {
    const data = {
      title: 'Storage Bin Capacity Warning',
      message: `Storage bin ${binName} is ${utilizationPercent}% full`,
      type: 'warning',
      link: '/storage-bins',
      metadata: { binName, utilizationPercent }
    };

    if (userId) {
      return await createNotification(userId, data);
    } else {
      // Notify warehouse managers and admins
      return await createNotificationForRole('warehouse_manager', data);
    }
  },

  /**
   * Settings updated
   */
  async settingsUpdated(updatedBy, userId = null) {
    const data = {
      title: 'System Settings Updated',
      message: `System settings have been updated by ${updatedBy}`,
      type: 'info',
      link: '/settings',
      metadata: { updatedBy }
    };

    if (userId) {
      return await createNotification(userId, data);
    } else {
      // Notify all admins
      return await notifyAdmins(data);
    }
  }
};

module.exports = {
  createNotification,
  createNotificationsForUsers,
  createNotificationForRole,
  notifyAdmins,
  NotificationTriggers
};

