const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    message: {
        type: String,
        required: true,
        maxlength: 500
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error'],
        default: 'info'
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    link: {
        type: String,
        trim: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Index for efficient queries
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function (userId, data) {
    try {
        const notification = await this.create({
            user: userId,
            ...data
        });
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function (userId) {
    return this.updateMany(
        { user: userId, isRead: false },
        { isRead: true }
    );
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function () {
    this.isRead = true;
    return this.save();
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
