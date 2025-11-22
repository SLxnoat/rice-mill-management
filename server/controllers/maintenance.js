const Machine = require('../models/Machine');
const MaintenanceLog = require('../models/MaintenanceLog');

// Get all machines
exports.getMachines = async (req, res) => {
    try {
        const { status } = req.query;

        let query = {};
        if (status) query.status = status;

        const machines = await Machine.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: machines.length,
            machines
        });
    } catch (error) {
        console.error('Get machines error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch machines'
        });
    }
};

// Create machine
exports.createMachine = async (req, res) => {
    try {
        const machine = await Machine.create(req.body);

        res.status(201).json({
            success: true,
            machine
        });
    } catch (error) {
        console.error('Create machine error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create machine'
        });
    }
};

// Update machine
exports.updateMachine = async (req, res) => {
    try {
        const machine = await Machine.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!machine) {
            return res.status(404).json({
                success: false,
                error: 'Machine not found'
            });
        }

        res.json({
            success: true,
            machine
        });
    } catch (error) {
        console.error('Update machine error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update machine'
        });
    }
};

// Get maintenance logs
exports.getMaintenanceLogs = async (req, res) => {
    try {
        const { machine, type, startDate, endDate } = req.query;

        let query = {};

        if (machine) query.machine = machine;
        if (type) query.type = type;

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const logs = await MaintenanceLog.find(query)
            .populate('machine', 'name machineId')
            .populate('performedBy', 'name')
            .sort({ date: -1 });

        res.json({
            success: true,
            count: logs.length,
            logs
        });
    } catch (error) {
        console.error('Get maintenance logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch maintenance logs'
        });
    }
};

// Create maintenance log
exports.createMaintenanceLog = async (req, res) => {
    try {
        const log = await MaintenanceLog.create({
            ...req.body,
            performedBy: req.user._id
        });

        // Update machine last maintenance date
        await Machine.findByIdAndUpdate(req.body.machine, {
            lastMaintenance: req.body.date
        });

        const populatedLog = await MaintenanceLog.findById(log._id)
            .populate('machine', 'name machineId')
            .populate('performedBy', 'name');

        res.status(201).json({
            success: true,
            log: populatedLog
        });
    } catch (error) {
        console.error('Create maintenance log error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create maintenance log'
        });
    }
};

// Get machine statistics
exports.getMachineStats = async (req, res) => {
    try {
        const totalMachines = await Machine.countDocuments();
        const activeMachines = await Machine.countDocuments({ status: 'operational' });
        const underMaintenance = await Machine.countDocuments({ status: 'under_maintenance' });

        const maintenanceThisMonth = await MaintenanceLog.countDocuments({
            date: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
        });

        res.json({
            success: true,
            stats: {
                totalMachines,
                activeMachines,
                underMaintenance,
                maintenanceThisMonth
            }
        });
    } catch (error) {
        console.error('Get machine stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch machine statistics'
        });
    }
};
