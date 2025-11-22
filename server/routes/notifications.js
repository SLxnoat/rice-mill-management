const express = require('express');
const { authenticate } = require('../middlewares/auth');
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearRead
} = require('../controllers/notification');

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

// GET /api/v1/notifications - Get user notifications
router.get('/', getNotifications);

// PATCH /api/v1/notifications/:id/read - Mark notification as read
router.patch('/:id/read', markAsRead);

// PATCH /api/v1/notifications/read-all - Mark all as read
router.patch('/read-all', markAllAsRead);

// DELETE /api/v1/notifications/:id - Delete a notification
router.delete('/:id', deleteNotification);

// DELETE /api/v1/notifications/clear-read - Clear all read notifications
router.delete('/clear-read', clearRead);

module.exports = router;
