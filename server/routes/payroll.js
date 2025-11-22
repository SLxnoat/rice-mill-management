const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { requirePayroll, requireRead } = require('../middlewares/role');
const { body } = require('express-validator');
const payrollController = require('../controllers/payroll');

// All routes require authentication
router.use(authenticate);

// Attendance routes
// View: all authenticated users (read-only)
router.get('/attendance', requireRead, payrollController.getAttendance);

// Mark attendance: admin, accountant
router.post('/attendance', requirePayroll, [
    body('employeeId').isMongoId().withMessage('Valid Employee ID is required'),
    body('status').optional().isIn(['present', 'absent', 'leave', 'half_day', 'holiday']),
], payrollController.markAttendance);

// Payslip routes
// View: all authenticated users (read-only)
router.get('/payslips', requireRead, payrollController.getPayslips);
router.get('/payslips/summary', requireRead, payrollController.getPayrollSummary);

// Generate payslip: admin, accountant
router.post('/payslips', requirePayroll, [
    body('employeeId').isMongoId().withMessage('Valid Employee ID is required'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required'),
    body('year').isInt({ min: 2000 }).withMessage('Valid year is required'),
], payrollController.generatePayslip);

// Enhanced salary management: admin, accountant
router.post('/salary/owner', requirePayroll, [
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required'),
    body('year').isInt({ min: 2000 }).withMessage('Valid year is required'),
    body('profitPercentage').optional().isFloat({ min: 0, max: 100 }),
], payrollController.calculateOwnerSalary);

router.post('/salary/driver', requirePayroll, [
    body('driverId').isMongoId().withMessage('Valid Driver ID is required'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required'),
    body('year').isInt({ min: 2000 }).withMessage('Valid year is required'),
    body('rateType').isIn(['daily', 'fixed']).withMessage('Rate type must be daily or fixed'),
], payrollController.calculateDriverSalary);

// Salary advances
// View: all authenticated users (read-only)
router.get('/advances', requireRead, payrollController.getSalaryAdvances);

// Record advance: admin, accountant
router.post('/advances', requirePayroll, [
    body('employeeId').isMongoId().withMessage('Valid Employee ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
], payrollController.recordSalaryAdvance);

module.exports = router;
