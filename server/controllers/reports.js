const ProductionBatch = require('../models/ProductionBatch');
const SalesOrder = require('../models/SalesOrder');
const RawMaterials = require('../models/RawMaterials');
const FinishedGoods = require('../models/FinishedGoods');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const Machine = require('../models/Machine');
const Attendance = require('../models/Attendance');
const Purchase = require('../models/Purchase');
const Invoice = require('../models/Invoice');
const Payslip = require('../models/Payslip');
const ByProduct = require('../models/ByProduct');
const MillSettings = require('../models/MillSettings');
const {
    DEFAULT_RECOVERY_RATE,
    DEFAULT_OWNER_SALARY_PCT,
    safeDivide,
    round,
    calcPaddyRequirement,
    calcCOGSPerKg,
    calcRevenuePerKg,
    calcGrossProfit,
    calcGrossProfitPerKg,
    calcNetProfitBeforeOwner,
    calcOwnerSalary,
    calcFinalNetProfit,
    calcBreakEvenKg,
    calcRecommendedPrice,
} = require('../utils/millEconomics');

// Daily production report
exports.getDailyProductionReport = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();

        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        const batches = await ProductionBatch.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).populate('rawMaterial.item finishedGoods.item');

        const totalInput = batches.reduce((sum, b) => sum + (b.rawMaterial?.quantity || 0), 0);
        const totalOutput = batches.reduce((sum, b) =>
            sum + b.finishedGoods.reduce((s, fg) => s + fg.quantity, 0), 0);

        res.json({
            success: true,
            date: targetDate,
            report: {
                totalBatches: batches.length,
                totalInputKg: totalInput,
                totalOutputKg: totalOutput,
                yieldPercentage: totalInput > 0 ? ((totalOutput / totalInput) * 100).toFixed(2) : 0,
                batches
            }
        });
    } catch (error) {
        console.error('Daily production report error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate daily production report'
        });
    }
};

// Stock movement report
exports.getStockMovementReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const rawMaterials = await RawMaterials.find();
        const finishedGoods = await FinishedGoods.find();

        res.json({
            success: true,
            period: { startDate: start, endDate: end },
            inventory: {
                rawMaterials,
                finishedGoods
            }
        });
    } catch (error) {
        console.error('Stock movement report error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate stock movement report'
        });
    }
};

// Profit/Loss report
exports.getProfitLossReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        // Calculate revenue from sales
        const sales = await SalesOrder.find({
            orderDate: { $gte: start, $lte: end },
            status: { $in: ['confirmed', 'invoiced'] }
        });

        const totalRevenue = sales.reduce((sum, order) => sum + order.totalAmount, 0);

        // Calculate expenses
        const expenses = await Expense.find({
            date: { $gte: start, $lte: end }
        });

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        const profit = totalRevenue - totalExpenses;

        res.json({
            success: true,
            period: { startDate: start, endDate: end },
            report: {
                totalRevenue,
                totalExpenses,
                profit,
                profitMargin: totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : 0
            }
        });
    } catch (error) {
        console.error('Profit/Loss report error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate profit/loss report'
        });
    }
};

// Customer outstanding report
exports.getCustomerOutstandingReport = async (req, res) => {
    try {
        const customers = await Customer.find({
            outstandingAmount: { $gt: 0 }
        }).sort({ outstandingAmount: -1 });

        const totalOutstanding = customers.reduce((sum, c) => sum + c.outstandingAmount, 0);

        res.json({
            success: true,
            report: {
                totalCustomers: customers.length,
                totalOutstanding,
                customers
            }
        });
    } catch (error) {
        console.error('Customer outstanding report error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate customer outstanding report'
        });
    }
};

// Machine performance report
exports.getMachinePerformanceReport = async (req, res) => {
    try {
        const machines = await Machine.find();

        // Get production batches per machine (if tracked)
        const report = machines.map(machine => ({
            machineId: machine.machineId,
            name: machine.name,
            status: machine.status,
            lastMaintenance: machine.lastMaintenance,
            specifications: machine.specifications
        }));

        res.json({
            success: true,
            report
        });
    } catch (error) {
        console.error('Machine performance report error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate machine performance report'
        });
    }
};

// Worker attendance report
exports.getAttendanceReport = async (req, res) => {
    try {
        const { month, year } = req.query;

        const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0);

        const attendance = await Attendance.find({
            date: { $gte: startDate, $lte: endDate }
        }).populate('user', 'name');

        res.json({
            success: true,
            period: { month: targetMonth, year: targetYear },
            report: {
                totalRecords: attendance.length,
                attendance
            }
        });
    } catch (error) {
        console.error('Attendance report error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate attendance report'
        });
    }
};

// Summary dashboard report
exports.getSummaryReport = async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [
            todayProduction,
            monthlyProduction,
            todaySales,
            monthlySales,
            rawMaterialsCount,
            finishedGoodsCount,
            totalExpenses
        ] = await Promise.all([
            ProductionBatch.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }),
            ProductionBatch.countDocuments({ createdAt: { $gte: startOfMonth } }),
            SalesOrder.countDocuments({ orderDate: { $gte: new Date().setHours(0, 0, 0, 0) } }),
            SalesOrder.countDocuments({ orderDate: { $gte: startOfMonth } }),
            RawMaterials.countDocuments(),
            FinishedGoods.countDocuments(),
            Expense.aggregate([
                { $match: { date: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);

        res.json({
            success: true,
            summary: {
                todayProduction,
                monthlyProduction,
                todaySales,
                monthlySales,
                totalInventory: rawMaterialsCount + finishedGoodsCount,
                monthlyExpenses: totalExpenses[0]?.total || 0
            }
        });
    } catch (error) {
        console.error('Summary report error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate summary report'
        });
    }
};

exports.getMillEconomicsReport = async (req, res) => {
    try {
        const today = new Date();
        const start = req.query.startDate ? new Date(req.query.startDate) : new Date(today.getFullYear(), today.getMonth(), 1);
        const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid startDate or endDate' });
        }

        if (start > end) {
            return res.status(400).json({ error: 'startDate must be before endDate' });
        }

        const settings = await MillSettings.getSettings();

        const targetRiceKg = Number(req.query.targetRiceKg) || null;
        const desiredMarginPerKg = Number(req.query.desiredMarginPerKg) || (settings.targetProfitMargin * 100) || 5;
        const requestedRecoveryRate = Number(req.query.recoveryRate) || settings.millingRecoveryRate || DEFAULT_RECOVERY_RATE;
        const ownerSalaryPct = Number(req.query.ownerSalaryPct) || settings.ownerSalaryPercentage || DEFAULT_OWNER_SALARY_PCT;
        const scrapPct = Number(req.query.scrapPct) || 0.1;
        const usefulLifeYears = Number(req.query.usefulLifeYears) || 10;

        const [
            purchaseBreakdown,
            batchAggregation,
            invoiceTotals,
            invoiceItems,
            expenseSummary,
            pendingExpenses,
            finishedSummary,
            rawMaterialSummary,
            payrollBreakdown,
            labourAttendance,
            byProductBreakdown,
            machines,
            recentBatches
        ] = await Promise.all([
            Purchase.aggregate([
                {
                    $match: {
                        receivedAt: { $gte: start, $lte: end },
                        status: { $ne: 'cancelled' }
                    }
                },
                {
                    $group: {
                        _id: '$paddyType',
                        totalQtyKg: { $sum: '$netWeightKg' },
                        totalCost: { $sum: '$totalAmount' },
                        avgPricePerKg: { $avg: '$pricePerKg' }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            ProductionBatch.aggregate([
                {
                    $match: {
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalInput: { $sum: '$inputPaddyKg' },
                        totalRiceOutput: { $sum: '$output.outputRiceKg' },
                        totalBroken: { $sum: '$output.brokenRiceKg' },
                        totalBran: { $sum: '$output.branKg' },
                        totalHusk: { $sum: '$output.huskKg' },
                        batchCount: { $sum: 1 }
                    }
                }
            ]),
            Invoice.aggregate([
                {
                    $match: {
                        invoiceDate: { $gte: start, $lte: end },
                        status: 'active'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$totalAmount' },
                        totalPaid: { $sum: '$paidAmount' },
                        totalOutstanding: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } }
                    }
                }
            ]),
            Invoice.aggregate([
                {
                    $match: {
                        invoiceDate: { $gte: start, $lte: end },
                        status: 'active'
                    }
                },
                { $unwind: '$items' },
                {
                    $addFields: {
                        productNameLower: { $toLower: '$items.productName' }
                    }
                },
                {
                    $addFields: {
                        paddyType: {
                            $switch: {
                                branches: [
                                    { case: { $regexMatch: { input: '$productNameLower', regex: 'nadu' } }, then: 'nadu' },
                                    { case: { $regexMatch: { input: '$productNameLower', regex: 'samba' } }, then: 'samba' },
                                    { case: { $regexMatch: { input: '$productNameLower', regex: 'broken' } }, then: 'broken' }
                                ],
                                default: 'other'
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: '$paddyType',
                        totalQtyKg: { $sum: '$items.qtyKg' },
                        totalRevenue: { $sum: '$items.totalPrice' },
                        avgPricePerKg: { $avg: '$items.unitPrice' }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Expense.aggregate([
                {
                    $match: {
                        date: { $gte: start, $lte: end },
                        paymentStatus: 'paid'
                    }
                },
                {
                    $group: {
                        _id: '$type',
                        totalAmount: { $sum: '$amount' }
                    }
                }
            ]),
            Expense.aggregate([
                {
                    $match: {
                        paymentStatus: { $ne: 'paid' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalPending: { $sum: '$amount' }
                    }
                }
            ]),
            FinishedGoods.aggregate([
                {
                    $match: { status: 'in_stock' }
                },
                {
                    $group: {
                        _id: '$paddyType',
                        totalWeight: { $sum: '$weightKg' },
                        totalValue: { $sum: '$totalValue' }
                    }
                }
            ]),
            RawMaterials.aggregate([
                {
                    $match: { status: 'available', category: 'Paddy' }
                },
                {
                    $group: {
                        _id: null,
                        totalQuantity: { $sum: '$quantity' }
                    }
                }
            ]),
            Payslip.aggregate([
                {
                    $match: {
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'employeeId',
                        foreignField: '_id',
                        as: 'employee'
                    }
                },
                {
                    $unwind: {
                        path: '$employee',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: '$employee.role',
                        netSalary: { $sum: '$netSalary' },
                        count: { $sum: 1 }
                    }
                }
            ]),
            Attendance.aggregate([
                {
                    $match: {
                        date: { $gte: start, $lte: end }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'employeeId',
                        foreignField: '_id',
                        as: 'employee'
                    }
                },
                {
                    $unwind: {
                        path: '$employee',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: { 'employee.role': 'labour' }
                },
                {
                    $group: {
                        _id: '$employeeId',
                        presentDays: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
                            }
                        },
                        overtimeHours: { $sum: '$overtimeHours' }
                    }
                }
            ]),
            ByProduct.aggregate([
                {
                    $match: {
                        productionDate: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: '$type',
                        soldQuantity: { $sum: '$soldQuantity' },
                        soldRevenue: { $sum: '$soldRevenue' }
                    }
                }
            ]),
            Machine.find().lean(),
            ProductionBatch.find({ createdAt: { $gte: start, $lte: end } })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()
        ]);

        const batchStats = batchAggregation[0] || {};
        const totalInputPaddy = batchStats.totalInput || 0;
        const totalRiceOutput = batchStats.totalRiceOutput || 0;
        const totalBrokenRice = batchStats.totalBroken || 0;
        const batchCount = batchStats.batchCount || 0;

        const purchaseTotals = purchaseBreakdown.reduce((acc, record) => {
            const qty = record.totalQtyKg || 0;
            const cost = record.totalCost || 0;
            acc.totalQty += qty;
            acc.totalCost += cost;
            acc.byType[record._id || 'other'] = {
                qtyKg: qty,
                totalCost: cost,
                avgPrice: record.avgPricePerKg || safeDivide(cost, qty)
            };
            return acc;
        }, { totalQty: 0, totalCost: 0, byType: {} });

        const totalPaddyCost = purchaseTotals.totalCost || 0;
        const totalPurchasesQty = purchaseTotals.totalQty || 0;
        const avgPaddyCostPerKg = safeDivide(totalPaddyCost, totalPurchasesQty);

        const invoiceTotalsRow = invoiceTotals[0] || {};
        const totalRevenue = invoiceTotalsRow.totalRevenue || 0;
        const totalPaid = invoiceTotalsRow.totalPaid || 0;
        const totalOutstanding = invoiceTotalsRow.totalOutstanding || 0;
        const riceSoldKg = invoiceItems.reduce((sum, row) => sum + (row.totalQtyKg || 0), 0);

        const recoveryRateActual = totalInputPaddy ? safeDivide(totalRiceOutput, totalInputPaddy) : null;
        const effectiveRecoveryRate = requestedRecoveryRate || recoveryRateActual || DEFAULT_RECOVERY_RATE;
        const effectiveTargetRice = targetRiceKg || totalRiceOutput || riceSoldKg;
        const paddyNeededForTarget = calcPaddyRequirement(effectiveTargetRice, effectiveRecoveryRate);

        const cogsPerKg = calcCOGSPerKg(totalPaddyCost, totalRiceOutput || riceSoldKg);
        const revenuePerKg = calcRevenuePerKg(totalRevenue, riceSoldKg || totalRiceOutput);
        const grossProfit = calcGrossProfit(totalRevenue, totalPaddyCost);
        const grossProfitPerKg = calcGrossProfitPerKg(revenuePerKg, cogsPerKg);

        const expenseMap = expenseSummary.reduce((acc, row) => {
            acc[row._id || 'other'] = row.totalAmount || 0;
            return acc;
        }, {});
        const expensesPaidTotal = Object.values(expenseMap).reduce((sum, amount) => sum + amount, 0);

        const payrollByRole = payrollBreakdown.reduce((acc, row) => {
            const roleKey = row._id || 'unassigned';
            acc[roleKey] = {
                netSalary: row.netSalary || 0,
                employeeCount: row.count || 0
            };
            return acc;
        }, {});
        const payrollNetTotal = payrollBreakdown.reduce((sum, row) => sum + (row.netSalary || 0), 0);

        const totalOpex = expensesPaidTotal + payrollNetTotal;
        const netProfitBeforeOwner = calcNetProfitBeforeOwner(grossProfit, totalOpex);
        const ownerSalaryAmount = calcOwnerSalary(netProfitBeforeOwner, ownerSalaryPct);
        const finalNetProfit = calcFinalNetProfit(netProfitBeforeOwner, ownerSalaryAmount);

        const labourCost = payrollByRole.labour?.netSalary || 0;
        const labourersCount = labourAttendance.length;
        const labourWorkDays = labourAttendance.reduce((sum, row) => sum + (row.presentDays || 0), 0);
        const labourDailyRateEstimate = labourWorkDays ? round(labourCost / labourWorkDays) : 0;
        const labourFormulaMonthly = round(labourDailyRateEstimate * labourersCount * (labourWorkDays / Math.max(labourersCount || 1, 1)));
        const driverSalary = payrollByRole.driver?.netSalary || 0;

        const finishedGoodsWeight = finishedSummary.reduce((sum, row) => sum + (row.totalWeight || 0), 0);
        const finishedGoodsValue = finishedSummary.reduce((sum, row) => sum + (row.totalValue || 0), 0);
        const rawMaterialStockKg = rawMaterialSummary[0]?.totalQuantity || 0;
        const paddyUsed = totalInputPaddy || 0;
        const openingStockEstimate = round(rawMaterialStockKg + paddyUsed - totalPurchasesQty);

        const pendingExpenseAmount = pendingExpenses[0]?.totalPending || 0;
        const inventoryValue = round(finishedGoodsValue);
        const accountsReceivable = round(totalOutstanding);
        const accountsPayable = round(pendingExpenseAmount);
        const workingCapital = round(inventoryValue + accountsReceivable - accountsPayable);

        const byProductTotals = byProductBreakdown.reduce((acc, row) => {
            acc.totalRevenue += row.soldRevenue || 0;
            acc.breakdown[row._id] = {
                type: row._id,
                quantityKg: row.soldQuantity || 0,
                revenue: row.soldRevenue || 0
            };
            return acc;
        }, { totalRevenue: 0, breakdown: {} });

        const totalProfitIncludingByProducts = round(finalNetProfit + byProductTotals.totalRevenue);

        const cashIn = round(totalPaid + byProductTotals.totalRevenue);
        const cashOut = round(totalPaddyCost + expensesPaidTotal + payrollNetTotal);
        const netCashFlow = round(cashIn - cashOut);

        const fixedCosts = round(
            (expenseMap.loan || 0) +
            (expenseMap.utilities || 0) +
            (expenseMap.maintenance || 0) +
            (expenseMap.salary || 0) +
            (expenseMap.insurance || 0) +
            (expenseMap.taxes || 0)
        );
        const breakEvenKg = calcBreakEvenKg(fixedCosts, grossProfitPerKg);
        const recommendedPrice = calcRecommendedPrice(cogsPerKg, desiredMarginPerKg);

        const depreciationTotals = machines.reduce((acc, machine) => {
            const purchaseCost = machine?.purchaseCost?.amount || 0;
            if (!purchaseCost || !usefulLifeYears) {
                return acc;
            }
            const scrapValue = purchaseCost * scrapPct;
            const depreciableBase = purchaseCost - scrapValue;
            const annual = depreciableBase / usefulLifeYears;
            acc.annual += annual;
            acc.monthly += annual / 12;
            return acc;
        }, { annual: 0, monthly: 0 });

        const perBatchOverhead = batchCount ? safeDivide(expensesPaidTotal, batchCount) : 0;
        const batchValuations = recentBatches.map((batch) => {
            const inputKg = batch.inputPaddyKg || 0;
            let typeCost = avgPaddyCostPerKg;
            if (batch.paddyType && purchaseTotals.byType[batch.paddyType]) {
                typeCost = purchaseTotals.byType[batch.paddyType].avgPrice || avgPaddyCostPerKg;
            } else if (batch.paddyType === 'mixed' && batch.paddyBreakdown) {
                const naduPortion = batch.paddyBreakdown.nadu || 0;
                const sambaPortion = batch.paddyBreakdown.samba || 0;
                const totalPortion = naduPortion + sambaPortion;
                if (totalPortion > 0) {
                    const naduCost = purchaseTotals.byType.nadu?.avgPrice || avgPaddyCostPerKg;
                    const sambaCost = purchaseTotals.byType.samba?.avgPrice || avgPaddyCostPerKg;
                    typeCost = safeDivide((naduPortion * naduCost) + (sambaPortion * sambaCost), totalPortion);
                }
            }
            const paddyCost = inputKg * typeCost;
            const batchOutputKg = batch.output?.outputRiceKg || 0;
            const batchCost = paddyCost + perBatchOverhead;
            const batchCostPerKg = calcCOGSPerKg(batchCost, batchOutputKg || inputKg);

            return {
                batchNumber: batch.batchNumber,
                paddyType: batch.paddyType || 'mixed',
                inputKg,
                outputKg: batchOutputKg,
                estimatedCost: round(batchCost),
                costPerKg: batchCostPerKg,
                startedAt: batch.startedAt,
            };
        });

        const salaryAccessRules = [
            { role: 'admin', access: 'create|approve|view' },
            { role: 'accountant', access: 'create|edit|calculate' },
            { role: 'sales_manager', access: 'view' },
            { role: 'warehouse_manager', access: 'view_own' },
            { role: 'operator', access: 'view_own' },
            { role: 'driver', access: 'view_own' },
            { role: 'labour', access: 'view_own' },
        ];

        res.json({
            success: true,
            filters: {
                startDate: start,
                endDate: end,
                targetRiceKg: effectiveTargetRice,
                desiredMarginPerKg,
                ownerSalaryPct,
                recoveryRate: effectiveRecoveryRate
            },
            economics: {
                conversion: {
                    actualRecoveryRate: round(recoveryRateActual ?? effectiveRecoveryRate),
                    effectiveRecoveryRate,
                    targetRiceKg: effectiveTargetRice,
                    paddyNeededKg: paddyNeededForTarget,
                    totalInputPaddyKg: totalInputPaddy,
                    totalRiceOutputKg: totalRiceOutput,
                    totalBrokenRiceKg: totalBrokenRice,
                },
                cogs: {
                    totalPaddyCost: round(totalPaddyCost),
                    cogsPerKg,
                    purchaseBreakdown: purchaseBreakdown.map((row) => ({
                        type: row._id,
                        qtyKg: row.totalQtyKg,
                        totalCost: row.totalCost,
                        avgPricePerKg: row.avgPricePerKg || safeDivide(row.totalCost, row.totalQtyKg),
                    }))
                },
                revenue: {
                    totalRevenue: round(totalRevenue),
                    revenuePerKg,
                    riceSoldKg,
                    breakdown: invoiceItems.map((row) => ({
                        type: row._id,
                        qtyKg: row.totalQtyKg,
                        revenue: row.totalRevenue,
                        avgPricePerKg: row.avgPricePerKg || safeDivide(row.totalRevenue, row.totalQtyKg)
                    }))
                },
                grossProfit: {
                    amount: grossProfit,
                    perKg: grossProfitPerKg
                },
                labourAndSalaries: {
                    labourCost,
                    labourersCount,
                    labourWorkDays,
                    labourDailyRateEstimate,
                    labourFormulaMonthly,
                    driverSalary,
                    payrollByRole,
                    ownerSalaryAmount
                },
                opex: {
                    totalOpex: round(totalOpex),
                    expensesPaidTotal: round(expensesPaidTotal),
                    payrollNetTotal: round(payrollNetTotal),
                    expenseBreakdown: expenseMap
                },
                netProfit: {
                    netProfitBeforeOwner,
                    ownerSalaryAmount,
                    finalNetProfit
                },
                inventory: {
                    rawMaterialStockKg,
                    openingStockEstimate,
                    purchasesKg: totalPurchasesQty,
                    paddyUsedKg: paddyUsed,
                    finishedGoodsWeightKg: finishedGoodsWeight,
                    finishedGoodsValue,
                    formula: 'Current = Opening + Purchases – Used'
                },
                batchValuation: {
                    perBatchOverhead: round(perBatchOverhead),
                    batches: batchValuations
                },
                depreciation: {
                    annual: round(depreciationTotals.annual),
                    monthly: round(depreciationTotals.monthly),
                    assumptions: { scrapPct, usefulLifeYears }
                },
                workingCapital: {
                    inventoryValue,
                    accountsReceivable,
                    accountsPayable,
                    workingCapital
                },
                byProducts: {
                    totalRevenue: round(byProductTotals.totalRevenue),
                    breakdown: byProductTotals.breakdown,
                    totalProfitIncludingByProducts
                },
                cashFlow: {
                    cashIn,
                    cashOut,
                    netCashFlow,
                    inflowSources: ['Rice sales collections', 'By-product sales', 'Debtor payments'],
                    outflowUses: ['Paddy purchases', 'Salaries', 'Expenses', 'Loan servicing']
                },
                breakEven: {
                    fixedCosts,
                    profitPerKg: grossProfitPerKg,
                    breakEvenKg
                },
                priceSetting: {
                    cogsPerKg,
                    desiredMarginPerKg,
                    recommendedPricePerKg: recommendedPrice
                }
            },
            salaryWorkflow: {
                attendance: {
                    types: ['present', 'absent', 'half-day', 'overtime', 'leave', 'holiday'],
                    modules: ['self-entry for labour/driver/operator', 'admin overrides'],
                    labourAttendance: { labourersCount, labourWorkDays }
                },
                calculations: {
                    labourFormula: 'Monthly Salary = (Present Days × Daily Rate) + OT – Penalties – Advances',
                    monthlyFixed: 'Base Salary + Incentives – Deductions',
                    otRule: 'OT Pay = OT Hours × OT Rate'
                },
                approvalFlow: [
                    'System auto-calculates salaries from attendance + payslips',
                    'Accountant reviews & validates',
                    'Admin/Owner approves and releases payments',
                    'System issues payslips with digital signature slot'
                ],
                paymentMethods: ['cash', 'bank_transfer', 'cheque', 'mobile_money'],
                reporting: {
                    keyMetrics: [
                        'Total Salary Paid',
                        'Total OT Paid',
                        'Bonuses vs Deductions',
                        'Role-wise payroll cost',
                        'Salary vs Income ratio'
                    ],
                    monthlySummaryAvailable: true
                },
                accessControl: salaryAccessRules
            }
        });
    } catch (error) {
        console.error('Error compiling mill economics report:', error);
        res.status(500).json({ error: 'Failed to compile mill economics report' });
    }
};
