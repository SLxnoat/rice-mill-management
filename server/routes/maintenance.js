const express = require('express');
const router = express.Router();
const {
    getMachines,
    createMachine,
    updateMachine,
    getMaintenanceLogs,
    createMaintenanceLog,
    getMachineStats
} = require('../controllers/maintenance');
const { authenticate } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/role');

// Protect all routes
router.use(authenticate);

// Machine routes
router.route('/machines')
    .get(getMachines)
    .post(requireAdmin, createMachine);

router.route('/machines/:id')
    .put(requireAdmin, updateMachine);

// Maintenance log routes
router.route('/logs')
    .get(getMaintenanceLogs)
    .post(createMaintenanceLog);

// Statistics
router.get('/stats', getMachineStats);

module.exports = router;
