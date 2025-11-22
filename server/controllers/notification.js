const Notification = require('../models/Notification');

// Get notifications for the authenticated user
exports.getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        const userId = req.user._id;

        const query = { user: userId };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

        res.json({
            success: true,
            notifications,
            unreadCount,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications'
        });
    }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOne({ _id: id, user: userId });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        await notification.markAsRead();

        res.json({
            success: true,
            message: 'Notification marked as read',
            notification
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notification as read'
        });
    }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        const result = await Notification.markAllAsRead(userId);

        res.json({
            success: true,
            message: 'All notifications marked as read',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark all notifications as read'
        });
    }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOneAndDelete({ _id: id, user: userId });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete notification'
        });
    }
};

// Clear all read notifications
exports.clearRead = async (req, res) => {
    try {
        const userId = req.user._id;

        const result = await Notification.deleteMany({ user: userId, isRead: true });

        res.json({
            success: true,
            message: 'Read notifications cleared',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error clearing notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear notifications'
        });
    }
};

// Helper function to create notification (for internal use by other controllers)
exports.createNotification = async (userId, data) => {
    try {
        return await Notification.createNotification(userId, data);
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};
