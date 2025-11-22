const Attendance = require('../models/Attendance');
const Payslip = require('../models/Payslip');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const { validationResult } = require('express-validator');

// --- Attendance Management ---

exports.getAttendance = async (req, res) => {
    try {
        const { employeeId, startDate, endDate } = req.query;
        const query = {};

        if (employeeId) query.employeeId = employeeId;
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const attendance = await Attendance.find(query)
            .sort({ date: -1 })
            .populate('employeeId', 'name email');

        res.json({ attendance });
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
};

exports.markAttendance = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            employeeId,
            date,
            checkInTime,
            checkOutTime,
            status,
            leaveType,
            notes
        } = req.body;

        const attendance = new Attendance({
            employeeId,
            date: date || new Date(),
            checkInTime,
            checkOutTime,
            status: status || 'present',
            leaveType,
            notes,
            recordedBy: req.user.id
        });

        await attendance.save();
        res.status(201).json({ attendance, message: 'Attendance marked successfully' });

    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ error: 'Failed to mark attendance: ' + error.message });
    }
};

// --- Payslip Management ---

exports.getPayslips = async (req, res) => {
    try {
        const { employeeId, month, year } = req.query;
        const query = {};

        if (employeeId) query.employeeId = employeeId;
        if (month) query.month = parseInt(month);
        if (year) query.year = parseInt(year);

        const payslips = await Payslip.find(query)
            .sort({ year: -1, month: -1 })
            .populate('employeeId', 'name email')
            .populate('generatedBy', 'name');

        res.json({ payslips });
    } catch (error) {
        console.error('Error fetching payslips:', error);
        res.status(500).json({ error: 'Failed to fetch payslips' });
    }
};

exports.generatePayslip = async (req, res) => {
    try {
        const {
            employeeId,
            month,
            year,
            basicSalary,
            overtimePay,
            allowances,
            bonuses,
            incomeTax,
            deductions,
            advances
        } = req.body;

        // Check if payslip already exists
        const exists = await Payslip.existsForPeriod(employeeId, year, month);
        if (exists) {
            return res.status(400).json({ error: 'Payslip already exists for this period' });
        }

        // Get attendance summary for the month
        const attendanceSummary = await Attendance.getMonthlyAttendance(employeeId, year, month);

        const payslip = new Payslip({
            employeeId,
            month,
            year,
            basicSalary: basicSalary || 0,
            overtimePay: overtimePay || 0,
            allowances: allowances || 0,
            bonuses: bonuses || 0,
            incomeTax: incomeTax || 0,
            deductions: deductions || 0,
            advances: advances || 0,
            attendanceSummary: attendanceSummary[0] || {},
            generatedBy: req.user.id
        });

        await payslip.save();
        res.status(201).json({ payslip, message: 'Payslip generated successfully' });

    } catch (error) {
        console.error('Error generating payslip:', error);
        res.status(500).json({ error: 'Failed to generate payslip: ' + error.message });
    }
};

exports.markPayslipPaid = async (req, res) => {
    try {
        const { paymentMethod } = req.body;
        const payslip = await Payslip.findById(req.params.id);

        if (!payslip) {
            return res.status(404).json({ error: 'Payslip not found' });
        }

        await payslip.markAsPaid(paymentMethod || 'cash');
        res.json({ payslip, message: 'Payslip marked as paid' });

    } catch (error) {
        console.error('Error marking payslip as paid:', error);
        res.status(500).json({ error: 'Failed to mark payslip as paid' });
    }
};

exports.getPayrollSummary = async (req, res) => {
    try {
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({ error: 'Year and month are required' });
        }

        const summary = await Payslip.getMonthlyPayrollSummary(parseInt(year), parseInt(month));
        res.json({ summary: summary[0] || {} });

    } catch (error) {
        console.error('Error fetching payroll summary:', error);
        res.status(500).json({ error: 'Failed to fetch payroll summary' });
    }
};

// --- Enhanced Salary Management for Accountant ---

// Calculate owner salary based on profit percentage
exports.calculateOwnerSalary = async (req, res) => {
    try {
        const { month, year, profitPercentage } = req.body;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Calculate monthly profit
        const salesResult = await Invoice.aggregate([
            {
                $match: {
                    invoiceDate: { $gte: startDate, $lte: endDate },
                    paymentStatus: 'paid'
                }
            },
            { $group: { _id: null, totalSales: { $sum: '$totalAmount' } } }
        ]);

        const expensesResult = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate },
                    paymentStatus: 'paid'
                }
            },
            { $group: { _id: null, totalExpenses: { $sum: '$amount' } } }
        ]);

        const totalSales = salesResult[0]?.totalSales || 0;
        const totalExpenses = expensesResult[0]?.totalExpenses || 0;
        const profit = totalSales - totalExpenses;

        const ownerSalaryAmount = (profit * (profitPercentage || 10)) / 100; // Default 10%

        res.json({
            month,
            year,
            totalSales,
            totalExpenses,
            profit,
            profitPercentage,
            ownerSalaryAmount,
            period: { startDate, endDate }
        });

    } catch (error) {
        console.error('Error calculating owner salary:', error);
        res.status(500).json({ error: 'Failed to calculate owner salary' });
    }
};

// Calculate driver salary (fixed or daily + trip allowance)
exports.calculateDriverSalary = async (req, res) => {
    try {
        const { driverId, month, year, rateType, dailyRate, fixedSalary, tripAllowance } = req.body;

        // Get attendance for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const attendanceRecords = await Attendance.find({
            employeeId: driverId,
            date: { $gte: startDate, $lte: endDate },
            status: 'present'
        });

        const workingDays = attendanceRecords.length;

        let salaryAmount = 0;

        if (rateType === 'daily') {
            salaryAmount = workingDays * (dailyRate || 0);
        } else if (rateType === 'fixed') {
            salaryAmount = fixedSalary || 0;
        }

        // Add trip allowance (may be per trip or fixed)
        const totalTripAllowance = tripAllowance || 0;

        const totalSalary = salaryAmount + totalTripAllowance;

        res.json({
            driverId,
            month,
            year,
            rateType,
            workingDays,
            dailyRate,
            fixedSalary,
            tripAllowance: totalTripAllowance,
            salaryAmount,
            totalSalary,
            attendanceRecords
        });

    } catch (error) {
        console.error('Error calculating driver salary:', error);
        res.status(500).json({ error: 'Failed to calculate driver salary' });
    }
};

// Record salary advances
exports.recordSalaryAdvance = async (req, res) => {
    try {
        const { employeeId, amount, reason } = req.body;

        // Create expense record for advance
        const advanceExpense = new Expense({
            type: 'salary_advance',
            amount,
            description: `Salary advance for employee ${employeeId}: ${reason || 'N/A'}`,
            category: 'payroll',
            paymentMethod: 'cash',
            paymentStatus: 'paid',
            recordedBy: req.user.id,
            date: new Date()
        });

        await advanceExpense.save();

        res.json({
            advance: advanceExpense,
            message: 'Salary advance recorded successfully'
        });

    } catch (error) {
        console.error('Error recording salary advance:', error);
        res.status(500).json({ error: 'Failed to record salary advance' });
    }
};

// Get salary advances for an employee
exports.getSalaryAdvances = async (req, res) => {
    try {
        const { employeeId, startDate, endDate } = req.query;

        const query = { type: 'salary_advance' };

        if (employeeId) {
            query.description = { $regex: employeeId, $options: 'i' };
        }

        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const advances = await Expense.find(query)
            .sort({ date: -1 })
            .populate('recordedBy', 'name');

        res.json({ advances });

    } catch (error) {
        console.error('Error fetching salary advances:', error);
        res.status(500).json({ error: 'Failed to fetch salary advances' });
    }
};
