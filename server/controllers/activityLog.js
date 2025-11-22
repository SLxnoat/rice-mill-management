const ActivityLog = require('../models/ActivityLog');

// Get activity logs with filters
exports.getActivityLogs = async (req, res) => {
    try {
        const { module, action, user, startDate, endDate, limit = 50 } = req.query;

        let query = {};

        if (module) query.module = module;
        if (action) query.action = action;
        if (user) query.user = user;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const logs = await ActivityLog.find(query)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const total = await ActivityLog.countDocuments(query);

        res.json({
            success: true,
            count: logs.length,
            total,
            logs
        });
    } catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity logs'
        });
    }
};

// Get activity statistics
exports.getActivityStats = async (req, res) => {
    try {
        const totalActivities = await ActivityLog.countDocuments();

        const byModule = await ActivityLog.aggregate([
            { $group: { _id: '$module', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const byAction = await ActivityLog.aggregate([
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const recentActivities = await ActivityLog.find()
            .populate('user', 'name')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            stats: {
                totalActivities,
                byModule,
                byAction,
                recentActivities
            }
        });
    } catch (error) {
        console.error('Get activity stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity statistics'
        });
    }
};

// Delete old logs (cleanup)
exports.deleteOldLogs = async (req, res) => {
    try {
        const { days = 90 } = req.body;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await ActivityLog.deleteMany({
            createdAt: { $lt: cutoffDate }
        });

        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} old activity logs`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Delete old logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete old logs'
        });
    }
};
