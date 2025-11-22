const MillSettings = require('../models/MillSettings');

// Get mill settings
exports.getMillSettings = async (req, res) => {
    try {
        const settings = await MillSettings.getSettings();
        res.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error('Error fetching mill settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch mill settings'
        });
    }
};

// Update mill settings (admin only)
exports.updateMillSettings = async (req, res) => {
    try {
        const { validationResult } = require('express-validator');
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const settings = await MillSettings.updateSettings(req.body);
        
        // Trigger notification for settings update
        try {
            const { NotificationTriggers } = require('../utils/notifications');
            await NotificationTriggers.settingsUpdated(req.user.name);
        } catch (notifError) {
            console.warn('Could not send settings notification:', notifError.message);
        }

        res.json({
            success: true,
            message: 'Mill settings updated successfully',
            settings
        });
    } catch (error) {
        console.error('Error updating mill settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update mill settings: ' + error.message
        });
    }
};
