const Purchase = require('../models/Purchase');
const ProductionBatch = require('../models/ProductionBatch');
const RawMaterials = require('../models/RawMaterials');
const FinishedGoods = require('../models/FinishedGoods');
const SalesOrder = require('../models/SalesOrder');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Payslip = require('../models/Payslip');

exports.getOverview = async (req, res) => {
    try {
        // Get current month range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Get previous month range
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Helper function to calculate percentage change
        const calculateTrend = (current, previous) => {
            if (previous === 0) {
                return current > 0 ? { value: 100, direction: 'up' } : { value: 0, direction: 'neutral' };
            }
            const change = ((current - previous) / previous) * 100;
            return {
                value: Math.abs(parseFloat(change.toFixed(1))),
                direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
            };
        };

        // Total Revenue (from paid invoices this month)
        const revenueResult = await Invoice.aggregate([
            {
                $match: {
                    paymentStatus: 'paid',
                    paidAt: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' }
                }
            }
        ]);
        const totalRevenue = revenueResult[0]?.totalRevenue || 0;

        // Previous month revenue
        const prevRevenueResult = await Invoice.aggregate([
            {
                $match: {
                    paymentStatus: 'paid',
                    paidAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' }
                }
            }
        ]);
        const prevRevenue = prevRevenueResult[0]?.totalRevenue || 0;

        // Active Sales Orders
        const activeOrders = await SalesOrder.countDocuments({
            status: { $in: ['draft', 'confirmed', 'invoiced', 'shipped'] }
        });

        // Previous month active orders (orders created last month)
        const prevActiveOrders = await SalesOrder.countDocuments({
            orderDate: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
        });

        // Total Inventory Value (Finished Goods)
        const inventoryResult = await FinishedGoods.aggregate([
            {
                $match: { status: 'in_stock' }
            },
            {
                $group: {
                    _id: null,
                    totalValue: { $sum: '$totalValue' },
                    totalWeight: { $sum: '$weightKg' }
                }
            }
        ]);
        const inventoryValue = inventoryResult[0]?.totalValue || 0;
        const inventoryWeight = inventoryResult[0]?.totalWeight || 0;

        // Monthly Expenses
        const expensesResult = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: null,
                    totalExpenses: { $sum: '$amount' }
                }
            }
        ]);
        const totalExpenses = expensesResult[0]?.totalExpenses || 0;

        // Previous month expenses
        const prevExpensesResult = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: null,
                    totalExpenses: { $sum: '$amount' }
                }
            }
        ]);
        const prevExpenses = prevExpensesResult[0]?.totalExpenses || 0;

        // Production batches this month
        const batchCount = await ProductionBatch.countDocuments({
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // Previous month batches
        const prevBatchCount = await ProductionBatch.countDocuments({
            createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
        });

        // System Health Metrics
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Production Status: Check if any batches in last 7 days
        const recentBatches = await ProductionBatch.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });
        const productionStatus = recentBatches > 0 ? 'active' : 'idle';

        // Inventory Status: Check low stock alerts
        const lowStockCount = await FinishedGoods.countDocuments({
            status: 'in_stock',
            weightKg: { $lt: 100 } // Low stock threshold
        });
        let inventoryStatus = 'normal';
        if (lowStockCount > 5) inventoryStatus = 'critical';
        else if (lowStockCount > 0) inventoryStatus = 'warning';

        // Sales Status: Check if any orders in last 7 days
        const recentOrders = await SalesOrder.countDocuments({
            orderDate: { $gte: sevenDaysAgo }
        });
        const salesStatus = recentOrders > 0 ? 'active' : 'slow';

        // Overall Health Score
        let healthScore = 0;
        if (productionStatus === 'active') healthScore++;
        if (inventoryStatus === 'normal') healthScore++;
        if (salesStatus === 'active') healthScore++;

        let overallHealth = 'poor';
        if (healthScore === 3) overallHealth = 'excellent';
        else if (healthScore === 2) overallHealth = 'good';
        else if (healthScore === 1) overallHealth = 'fair';

        // Calculate trends
        const trends = {
            revenue: calculateTrend(totalRevenue, prevRevenue),
            expenses: calculateTrend(totalExpenses, prevExpenses),
            orders: calculateTrend(activeOrders, prevActiveOrders),
            batches: calculateTrend(batchCount, prevBatchCount),
            inventoryValue: { value: 0, direction: 'neutral' } // Placeholder - can calculate if historical data available
        };

        res.json({
            overview: {
                totalRevenue,
                activeOrders,
                inventoryValue,
                inventoryWeight,
                totalExpenses,
                batchCount,
                period: {
                    start: startOfMonth,
                    end: endOfMonth
                },
                trends,
                systemHealth: {
                    productionStatus,
                    inventoryStatus,
                    salesStatus,
                    overallHealth
                }
            }
        });
    } catch (error) {
        console.error('Error fetching overview:', error);
        res.status(500).json({ error: 'Failed to fetch overview' });
    }
};

exports.getProductionStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 3));
        const end = endDate ? new Date(endDate) : new Date();

        // Batches over time
        const batches = await ProductionBatch.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    totalInput: { $sum: '$inputPaddyKg' },
                    totalOutput: { $sum: '$totalOutputKg' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Status distribution
        const statusDist = await ProductionBatch.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            production: {
                batchesByMonth: batches,
                statusDistribution: statusDist
            }
        });
    } catch (error) {
        console.error('Error fetching production stats:', error);
        res.status(500).json({ error: 'Failed to fetch production stats' });
    }
};

exports.getSalesStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 3));
        const end = endDate ? new Date(endDate) : new Date();

        // Sales over time
        const salesTrend = await SalesOrder.aggregate([
            {
                $match: {
                    orderDate: { $gte: start, $lte: end },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$orderDate' },
                        month: { $month: '$orderDate' }
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Status distribution
        const statusDist = await SalesOrder.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            sales: {
                salesByMonth: salesTrend,
                statusDistribution: statusDist
            }
        });
    } catch (error) {
        console.error('Error fetching sales stats:', error);
        res.status(500).json({ error: 'Failed to fetch sales stats' });
    }
};

exports.getInventoryStatus = async (req, res) => {
    try {
        // Finished Goods by type and grade
        const finishedGoodsSummary = await FinishedGoods.aggregate([
            {
                $match: { status: 'in_stock' }
            },
            {
                $group: {
                    _id: { paddyType: '$paddyType', riceGrade: '$riceGrade' },
                    totalWeight: { $sum: '$weightKg' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Raw Materials summary
        const rawMaterialsSummary = await RawMaterials.aggregate([
            {
                $group: {
                    _id: '$paddyType',
                    totalQuantity: { $sum: '$quantityKg' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Low stock alerts
        const lowStockAlerts = await FinishedGoods.getLowStockAlerts(100);

        res.json({
            inventory: {
                finishedGoods: finishedGoodsSummary,
                rawMaterials: rawMaterialsSummary,
                lowStockAlerts
            }
        });
    } catch (error) {
        console.error('Error fetching inventory status:', error);
        res.status(500).json({ error: 'Failed to fetch inventory status' });
    }
};

exports.getFinancialSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 3));
        const end = endDate ? new Date(endDate) : new Date();

        // Expenses by category
        const expensesByCategory = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: '$category',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { totalAmount: -1 }
            }
        ]);

        // Monthly expenses trend
        const expensesTrend = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        res.json({
            financial: {
                expensesByCategory,
                expensesTrend
            }
        });
    } catch (error) {
        console.error('Error fetching financial summary:', error);
        res.status(500).json({ error: 'Failed to fetch financial summary' });
    }
};
