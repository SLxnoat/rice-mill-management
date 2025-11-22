const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
            'GENERATE_INVOICE', 'CREATE_BATCH', 'COMPLETE_BATCH',
            'PURCHASE_ORDER', 'MARK_ATTENDANCE', 'GENERATE_PAYSLIP'
        ]
    },
    module: {
        type: String,
        required: true,
        enum: [
            'AUTH', 'USERS', 'INVENTORY', 'PRODUCTION', 'SALES',
            'PROCUREMENT', 'ACCOUNTING', 'PAYROLL', 'CUSTOMERS',
            'MAINTENANCE', 'SETTINGS'
        ]
    },
    description: {
        type: String,
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId
    },
    targetModel: {
        type: String
    },
    ipAddress: {
        type: String
    },
    changes: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for faster queries
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ module: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
