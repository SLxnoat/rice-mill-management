const ActivityLog = require('../models/ActivityLog');

// Middleware to log activities
exports.logActivity = (action, module, description) => {
    return async (req, res, next) => {
        // Store original json function
        const originalJson = res.json.bind(res);

        // Override json function
        res.json = function (data) {
            // Call original function
            originalJson(data);

            // Log activity if successful
            if (data.success !== false && req.user) {
                ActivityLog.create({
                    user: req.user._id,
                    userName: req.user.name,
                    action,
                    module,
                    description: description || `${action} in ${module}`,
                    targetId: data.customer?._id || data.batch?._id || data.user?._id,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    changes: req.body
                }).catch(err => {
                    console.error('Activity log error:', err);
                });
            }
        };

        next();
    };
};

// Helper to create activity log directly
exports.createLog = async (user, action, module, description, targetId = null) => {
    try {
        await ActivityLog.create({
            user: user._id,
            userName: user.name,
            action,
            module,
            description,
            targetId
        });
    } catch (error) {
        console.error('Create activity log error:', error);
    }
};
