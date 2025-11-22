const Expense = require('../models/Expense');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Purchase = require('../models/Purchase');
const ProductionBatch = require('../models/ProductionBatch');
const RawMaterials = require('../models/RawMaterials');
const FinishedGoods = require('../models/FinishedGoods');
const { validationResult } = require('express-validator');

// --- Invoice Management ---

// Get all invoices with accounting filters
exports.getInvoicesAccounting = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            paymentStatus,
            customerName,
            minAmount,
            maxAmount
        } = req.query;

        const query = {};

        if (startDate && endDate) {
            query.invoiceDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (customerName) query.customerName = new RegExp(customerName, 'i');
        if (minAmount || maxAmount) {
            query.totalAmount = {};
            if (minAmount) query.totalAmount.$gte = parseFloat(minAmount);
            if (maxAmount) query.totalAmount.$lte = parseFloat(maxAmount);
        }

        const invoices = await Invoice.find(query)
            .sort({ invoiceDate: -1 })
            .populate('orderId', 'orderNumber customerName')
            .populate('billedBy', 'name')
            .populate('payments.processedBy', 'name');

        res.json({ invoices });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
};

// Get single invoice by ID
exports.getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate('orderId', 'orderNumber customerName customerAddress customerPhone items')
            .populate('billedBy', 'name email')
            .populate('payments.processedBy', 'name');

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json({ invoice });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
};

// Edit invoice (accountant can modify discount, tax, due date, notes)
exports.editInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Prevent editing paid invoices
        if (invoice.paymentStatus === 'paid') {
            return res.status(400).json({ error: 'Cannot edit a fully paid invoice' });
        }

        const updateFields = [
            'discountPercent', 'taxPercent', 'dueDate', 'notes',
            'customerName', 'customerAddress', 'customerPhone'
        ];

        // Recalculate totals if discount or tax changes
        const oldDiscount = invoice.discountPercent || 0;
        const oldTax = invoice.taxPercent || 0;

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                invoice[field] = req.body[field];
            }
        });

        // Recalculate totals
        const subtotal = invoice.subtotal;
        const discountAmount = (subtotal * (invoice.discountPercent || 0)) / 100;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = (taxableAmount * (invoice.taxPercent || 0)) / 100;

        invoice.discountAmount = discountAmount;
        invoice.taxAmount = taxAmount;
        invoice.totalAmount = taxableAmount + taxAmount;

        invoice.editedBy = req.user.id;
        invoice.editedAt = new Date();

        await invoice.save();

        // Log the edit
        console.log(`Invoice ${invoice.invoiceNumber} edited by ${req.user.name}`);

        res.json({
            invoice,
            message: 'Invoice updated successfully'
        });

    } catch (error) {
        console.error('Error editing invoice:', error);
        res.status(500).json({ error: 'Failed to edit invoice' });
    }
};

// Cancel invoice (with permission check)
exports.cancelInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Cannot cancel paid invoices
        if (invoice.paymentStatus === 'paid') {
            return res.status(400).json({ error: 'Cannot cancel a paid invoice' });
        }

        invoice.status = 'cancelled';
        invoice.cancelledBy = req.user.id;
        invoice.cancelledAt = new Date();
        invoice.cancelReason = req.body.reason || 'Cancelled by accountant';

        await invoice.save();

        res.json({
            invoice,
            message: `Invoice ${invoice.invoiceNumber} cancelled successfully`
        });

    } catch (error) {
        console.error('Error cancelling invoice:', error);
        res.status(500).json({ error: 'Failed to cancel invoice' });
    }
};

// Record payment for invoice
exports.recordInvoicePayment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { amount, paymentMethod, paymentDate, notes } = req.body;

        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        if (invoice.status === 'cancelled') {
            return res.status(400).json({ error: 'Cannot record payment for cancelled invoice' });
        }

        // Create payment record
        const payment = {
            amount: parseFloat(amount),
            paymentMethod,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            processedBy: req.user.id,
            notes: notes || ''
        };

        if (!invoice.payments) {
            invoice.payments = [];
        }
        invoice.payments.push(payment);

        // Update payment status
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);

        if (totalPaid >= invoice.totalAmount) {
            invoice.paymentStatus = 'paid';
            invoice.paidAt = new Date();
        } else if (totalPaid > 0) {
            invoice.paymentStatus = 'partially_paid';
        }

        await invoice.save();

        // Update customer outstanding balance
        if (invoice.customerName) {
            const customer = await Customer.findOne({ name: invoice.customerName });
            if (customer) {
                customer.outstandingAmount = Math.max(0,
                    (customer.outstandingAmount || 0) - parseFloat(amount)
                );
                await customer.save();
            }
        }

        // Trigger notification for payment received
        try {
            const { NotificationTriggers } = require('../utils/notifications');
            await NotificationTriggers.paymentReceived(
                invoice.invoiceNumber,
                parseFloat(amount),
                invoice.customerName
            );
        } catch (notifError) {
            console.warn('Could not send payment notification:', notifError.message);
        }

        res.json({
            invoice,
            payment,
            message: 'Payment recorded successfully'
        });

    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ error: 'Failed to record payment: ' + error.message });
    }
};

// --- Payment Management ---

// Get customer payments history
exports.getCustomerPayments = async (req, res) => {
    try {
        const { customerId, startDate, endDate } = req.query;
        const query = {};

        if (customerId) query['payments.customerId'] = customerId;
        if (startDate && endDate) {
            query['payments.paymentDate'] = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const invoices = await Invoice.find({
            'payments.0': { $exists: true }
        }).populate('payments.processedBy', 'name');

        const payments = invoices.flatMap(invoice =>
            invoice.payments.map(payment => ({
                invoiceNumber: invoice.invoiceNumber,
                invoiceId: invoice._id,
                customerName: invoice.customerName,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                paymentDate: payment.paymentDate,
                processedBy: payment.processedBy?.name,
                notes: payment.notes
            }))
        );

        res.json({ payments });
    } catch (error) {
        console.error('Error fetching customer payments:', error);
        res.status(500).json({ error: 'Failed to fetch customer payments' });
    }
};

// Get customer outstanding balances
exports.getCustomerBalances = async (req, res) => {
    try {
        const customers = await Customer.find();

        // Get unpaid/partial invoices per customer
        const outstandingInvoices = await Invoice.aggregate([
            {
                $match: {
                    paymentStatus: { $in: ['unpaid', 'partially_paid'] },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: '$customerName',
                    totalOutstanding: { $sum: '$totalAmount' },
                    totalPaid: {
                        $sum: {
                            $ifNull: [
                                { $sum: '$payments.amount' },
                                0
                            ]
                        }
                    },
                    invoiceCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    customerName: '$_id',
                    totalOutstanding: 1,
                    paidAmount: '$totalPaid',
                    outstandingAmount: { $subtract: ['$totalOutstanding', '$totalPaid'] },
                    invoiceCount: 1
                }
            }
        ]);

        res.json({ customerBalances: outstandingInvoices });
    } catch (error) {
        console.error('Error fetching customer balances:', error);
        res.status(500).json({ error: 'Failed to fetch customer balances' });
    }
};

// Approval for outstanding settlements
exports.approveOutstandingSettlement = async (req, res) => {
    try {
        const { customerId, approvalNotes } = req.body;

        // This would typically involve marking approved settlements
        // For now, we'll update the customer record
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        customer.settlementApprovedBy = req.user.id;
        customer.settlementApprovedAt = new Date();
        customer.approvalNotes = approvalNotes;

        await customer.save();

        res.json({
            customer,
            message: 'Settlement approved successfully'
        });

    } catch (error) {
        console.error('Error approving settlement:', error);
        res.status(500).json({ error: 'Failed to approve settlement' });
    }
};

// --- Expense Management (Enhanced) ---

exports.getExpenses = async (req, res) => {
    try {
        const { startDate, endDate, category, type } = req.query;
        const query = {};

        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (category) query.category = category;
        if (type) query.type = type;

        const expenses = await Expense.find(query)
            .sort({ date: -1 })
            .populate('recordedBy', 'name')
            .populate('approvedBy', 'name');

        res.json({ expenses });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};

exports.createExpense = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            type,
            amount,
            description,
            category,
            vendor,
            date,
            paymentMethod,
            paymentStatus,
            notes
        } = req.body;

        const expense = new Expense({
            type,
            amount,
            description,
            category,
            vendor,
            date: date || new Date(),
            paymentMethod,
            paymentStatus: paymentStatus || 'paid',
            paidAt: paymentStatus === 'paid' ? new Date() : undefined,
            recordedBy: req.user.id,
            notes
        });

        await expense.save();
        res.status(201).json({ expense, message: 'Expense recorded successfully' });

    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Failed to create expense: ' + error.message });
    }
};

exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const Expense = require('../models/Expense');
    
    const expense = await Expense.findById(id)
      .populate('recordedBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ expense });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateExpense = async (req, res) => {
    try {
        const { validationResult } = require('express-validator');
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const Expense = require('../models/Expense');
        
        const expense = await Expense.findById(id);
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        // Update expense fields
        Object.assign(expense, req.body);
        expense.recordedBy = req.user.id;
        await expense.save();

        res.json({ expense, message: 'Expense updated successfully' });
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Failed to update expense: ' + error.message });
    }
};

exports.deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const Expense = require('../models/Expense');
        
        const expense = await Expense.findById(id);
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        await Expense.findByIdAndDelete(id);
        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Failed to delete expense: ' + error.message });
    }
};

exports.getExpenseSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const summary = await Expense.getExpenseSummary(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined
        );

        res.json({ summary });
    } catch (error) {
        console.error('Error fetching expense summary:', error);
        res.status(500).json({ error: 'Failed to fetch expense summary' });
    }
};

// --- Enhanced Purchase Management ---

// Add costs to purchase orders
exports.addPurchaseCosts = async (req, res) => {
    try {
        const { transportCost, labourCost, packagingCost, handlingCharges } = req.body;

        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        purchase.transportCost = transportCost || 0;
        purchase.labourCost = labourCost || 0;
        purchase.packagingCost = packagingCost || 0;
        purchase.handlingCharges = handlingCharges || 0;

        // Recalculate total cost
        const paddyCost = purchase.quantityKg * purchase.unitPrice;
        purchase.totalCost = paddyCost + (purchase.transportCost + purchase.labourCost +
                         purchase.packagingCost + purchase.handlingCharges);

        await purchase.save();

        res.json({
            purchase,
            message: 'Purchase costs added successfully'
        });

    } catch (error) {
        console.error('Error adding purchase costs:', error);
        res.status(500).json({ error: 'Failed to add purchase costs' });
    }
};

// --- Cashflow Management ---

exports.recordCashTransaction = async (req, res) => {
    try {
        const { type, amount, description, category, paymentMethod } = req.body;

        // This would be a new CashTransaction model
        // For now, we'll use Expense for cash outflows
        let transaction;

        if (type === 'out') {
            transaction = new Expense({
                type: 'cash_outflow',
                amount,
                description,
                category: category || 'cash_transaction',
                paymentMethod: paymentMethod || 'cash',
                paymentStatus: 'paid',
                recordedBy: req.user.id,
                date: new Date()
            });
            await transaction.save();
        }

        res.json({
            transaction,
            message: 'Cash transaction recorded successfully'
        });

    } catch (error) {
        console.error('Error recording cash transaction:', error);
        res.status(500).json({ error: 'Failed to record cash transaction' });
    }
};

exports.getCashBalance = async (req, res) => {
    try {
        // Aggregate cash inflows and outflows
        // This is a simplified version
        const cashInflows = 0; // Would aggregate invoice payments with paymentMethod='cash'
        const cashOutflows = await Expense.aggregate([
            {
                $match: {
                    paymentMethod: 'cash',
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const runningBalance = cashInflows - (cashOutflows[0]?.total || 0);

        res.json({
            cashInflows,
            cashOutflows: cashOutflows[0]?.total || 0,
            runningBalance
        });

    } catch (error) {
        console.error('Error calculating cash balance:', error);
        res.status(500).json({ error: 'Failed to calculate cash balance' });
    }
};

// --- Financial Dashboard ---

exports.getFinancialOverview = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
        const end = endDate ? new Date(endDate) : new Date();

        // Total monthly sales (invoices)
        const salesResult = await Invoice.aggregate([
            {
                $match: {
                    invoiceDate: { $gte: start, $lte: end },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalAmount' }
                }
            }
        ]);
        const totalMonthlySales = salesResult[0]?.totalSales || 0;

        // Total expenses
        const expensesResult = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
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
        const totalMonthlyExpenses = expensesResult[0]?.totalExpenses || 0;

        // Profit/Loss
        const profitLoss = totalMonthlySales - totalMonthlyExpenses;

        // Outstanding customer payments
        const outstandingCustomer = await Invoice.aggregate([
            {
                $match: {
                    paymentStatus: { $in: ['unpaid', 'partially_paid'] },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: null,
                    outstanding: {
                        $sum: {
                            $subtract: [
                                '$totalAmount',
                                { $ifNull: [{ $sum: '$payments.amount' }, 0] }
                            ]
                        }
                    }
                }
            }
        ]);

        res.json({
            financialOverview: {
                totalMonthlySales,
                totalMonthlyExpenses,
                profitLoss,
                outstandingCustomerPayments: outstandingCustomer[0]?.outstanding || 0,
                period: { start, end }
            }
        });

    } catch (error) {
        console.error('Error fetching financial overview:', error);
        res.status(500).json({ error: 'Failed to fetch financial overview' });
    }
};

// --- Loan & Liability Tracking ---

// Record loan taken
exports.recordLoan = async (req, res) => {
    try {
        const {
            loanAmount,
            borrowerName,
            interestRate,
            repaymentPeriodMonths,
            loanDate,
            purpose,
            lenderDetails,
            notes
        } = req.body;

        // Calculate monthly interest
        const monthlyInterest = (loanAmount * interestRate) / (100 * 12);

        const loan = new Expense({
            type: 'loan_taken',
            amount: loanAmount,
            description: `Loan taken: ${purpose || 'Business purpose'}`,
            category: 'liability',
            vendor: lenderDetails || borrowerName,
            date: loanDate ? new Date(loanDate) : new Date(),
            paymentMethod: 'loan',
            paymentStatus: 'pending',
            recordedBy: req.user.id,
            notes: `Interest Rate: ${interestRate}%, Period: ${repaymentPeriodMonths} months, Borrower: ${borrowerName}`,
            loanDetails: {
                borrowerName,
                interestRate,
                repaymentPeriodMonths,
                initialAmount: loanAmount,
                outstandingAmount: loanAmount,
                monthlyInterest
            }
        });

        await loan.save();

        res.json({
            loan,
            message: 'Loan recorded successfully'
        });

    } catch (error) {
        console.error('Error recording loan:', error);
        res.status(500).json({ error: 'Failed to record loan: ' + error.message });
    }
};

// Record loan installment payment
exports.recordLoanPayment = async (req, res) => {
    try {
        const { loanId, principalAmount, interestAmount, paymentDate } = req.body;

        const loan = await Expense.findById(loanId);
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }

        // Update outstanding amount
        const totalPayment = principalAmount + interestAmount;
        loan.loanDetails.outstandingAmount -= principalAmount;

        // Record the payment as an expense
        const paymentRecord = new Expense({
            type: 'loan_payment',
            amount: totalPayment,
            description: `Loan payment for ${loan.loanDetails.borrowerName}`,
            category: 'liability',
            paymentMethod: 'bank_transfer',
            paymentStatus: 'paid',
            paidAt: new Date(paymentDate),
            recordedBy: req.user.id,
            notes: `Principal: ${principalAmount}, Interest: ${interestAmount}`
        });

        await paymentRecord.save();

        res.json({
            payment: paymentRecord,
            remainingBalance: loan.loanDetails.outstandingAmount,
            message: 'Loan payment recorded successfully'
        });

    } catch (error) {
        console.error('Error recording loan payment:', error);
        res.status(500).json({ error: 'Failed to record loan payment' });
    }
};

// Get loan liability summary
exports.getLoanSummary = async (req, res) => {
    try {
        const loans = await Expense.find({
            type: 'loan_taken',
            'loanDetails.outstandingAmount': { $gt: 0 }
        }).sort({ date: -1 });

        const totalOutstanding = loans.reduce((sum, loan) =>
            sum + (loan.loanDetails?.outstandingAmount || 0), 0
        );

        const totalMonthlyPayments = loans.reduce((sum, loan) =>
            sum + (loan.loanDetails?.monthlyInterest || 0), 0
        );

        res.json({
            loans,
            summary: {
                totalLoans: loans.length,
                totalOutstanding,
                monthlyPaymentLoad: totalMonthlyPayments
            }
        });

    } catch (error) {
        console.error('Error fetching loan summary:', error);
        res.status(500).json({ error: 'Failed to fetch loan summary' });
    }
};

// Record asset purchase
exports.recordAssetPurchase = async (req, res) => {
    try {
        const {
            assetName,
            category,
            purchaseAmount,
            depreciationRate,
            usefulLifeYears,
            purchaseDate,
            vendor,
            notes
        } = req.body;

        const asset = new Expense({
            type: 'asset_purchase',
            amount: purchaseAmount,
            description: `Asset purchase: ${assetName}`,
            category: 'asset',
            vendor,
            date: purchaseDate ? new Date(purchaseDate) : new Date(),
            paymentMethod: 'bank_transfer',
            paymentStatus: 'paid',
            paidAt: purchaseDate ? new Date(purchaseDate) : new Date(),
            recordedBy: req.user.id,
            notes,
            assetDetails: {
                assetName,
                category,
                depreciationRate,
                usefulLifeYears,
                currentValue: purchaseAmount,
                accumulatedDepreciation: 0
            }
        });

        await asset.save();

        res.json({
            asset,
            message: 'Asset purchase recorded successfully'
        });

    } catch (error) {
        console.error('Error recording asset purchase:', error);
        res.status(500).json({ error: 'Failed to record asset purchase: ' + error.message });
    }
};

// --- Profit & Cost Analysis ---

// Calculate cost per kg of rice
exports.getCostPerKgAnalysis = async (req, res) => {
    try {
        const { month, year } = req.query;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Get total production output
        const batches = await ProductionBatch.find({
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const totalOutputKg = batches.reduce((sum, batch) =>
            sum + (batch.totalOutputKg || 0), 0
        );

        // Get production costs (raw materials + expenses)
        const rawMaterialCosts = await RawMaterials.aggregate([
            {
                $match: {
                    purchaseDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalCost: { $sum: '$totalCost' }
                }
            }
        ]);

        const productionExpenses = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate },
                    category: 'production'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const totalCosts = (rawMaterialCosts[0]?.totalCost || 0) +
                          (productionExpenses[0]?.total || 0);

        const costPerKg = totalOutputKg > 0 ? totalCosts / totalOutputKg : 0;

        res.json({
            analysis: {
                month,
                year,
                totalOutputKg,
                totalCosts,
                costPerKg: costPerKg.toFixed(2),
                period: { startDate, endDate }
            }
        });

    } catch (error) {
        console.error('Error calculating cost per kg:', error);
        res.status(500).json({ error: 'Failed to calculate cost per kg' });
    }
};

// Calculate profit by product type
exports.getProfitByProduct = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
        const end = endDate ? new Date(endDate) : new Date();

        // Get sales by rice type
        const salesByRiceType = await Invoice.aggregate([
            {
                $match: {
                    invoiceDate: { $gte: start, $lte: end },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $unwind: '$items'
            },
            {
                $group: {
                    _id: '$items.productName',
                    totalRevenue: { $sum: '$items.totalPrice' },
                    totalQuantity: { $sum: '$items.qtyKg' }
                }
            },
            {
                $sort: { totalRevenue: -1 }
            }
        ]);

        // For now, return sales data with placeholder profitability
        // In a real implementation, you'd track cost of goods sold per product
        const profitabilityAnalysis = salesByRiceType.map(product => ({
            productName: product._id,
            totalRevenue: product.totalRevenue,
            totalQuantity: product.totalQuantity,
            averagePricePerKg: product.totalRevenue / product.totalQuantity,
            // Placeholder for actual calculations
            estimatedProfitMargin: 0.15 // 15% placeholder
        }));

        res.json({
            profitabilityAnalysis,
            period: { start, end }
        });

    } catch (error) {
        console.error('Error calculating profit by product:', error);
        res.status(500).json({ error: 'Failed to calculate profit by product' });
    }
};

// --- Enhanced Financial Reports ---

// Generate detailed sales report
exports.getDetailedSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, format = 'json' } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
        const end = endDate ? new Date(endDate) : new Date();

        const salesData = await Invoice.aggregate([
            {
                $match: {
                    invoiceDate: { $gte: start, $lte: end },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$invoiceDate' },
                        month: { $month: '$invoiceDate' }
                    },
                    totalInvoices: { $sum: 1 },
                    totalSales: { $sum: '$totalAmount' },
                    totalTax: { $sum: '$taxAmount' },
                    totalDiscount: { $sum: '$discountAmount' },
                    paidInvoices: {
                        $sum: {
                            $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0]
                        }
                    },
                    outstandingAmount: {
                        $sum: {
                            $subtract: [
                                '$totalAmount',
                                { $ifNull: [{ $sum: '$payments.amount' }, 0] }
                            ]
                        }
                    }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // If format is 'excel', you'd implement Excel generation here
        // For now, return JSON report
        res.json({
            salesReport: salesData,
            summary: {
                totalRevenue: salesData.reduce((sum, item) => sum + item.totalSales, 0),
                totalOutstanding: salesData.reduce((sum, item) => sum + item.outstandingAmount, 0),
                averageInvoiceValue: salesData.reduce((sum, item) => sum + item.totalSales, 0) /
                                   salesData.reduce((sum, item) => sum + item.totalInvoices, 0) || 0
            },
            period: { start, end }
        });

    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ error: 'Failed to generate sales report' });
    }
};

// Generate expense breakdown report
exports.getExpenseBreakdownReport = async (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
        const end = endDate ? new Date(endDate) : new Date();

        const matchCondition = {
            date: { $gte: start, $lte: end },
            paymentStatus: 'paid'
        };

        if (category) matchCondition.category = category;

        const expensesByCategory = await Expense.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: '$category',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                    averageAmount: { $avg: '$amount' }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        const expensesByType = await Expense.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: '$type',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        res.json({
            expenseReport: {
                byCategory: expensesByCategory,
                byType: expensesByType,
                totalExpenses: expensesByCategory.reduce((sum, cat) => sum + cat.totalAmount, 0)
            },
            period: { start, end }
        });

    } catch (error) {
        console.error('Error generating expense report:', error);
        res.status(500).json({ error: 'Failed to generate expense report' });
    }
};

// Generate profitability analysis report
exports.getProfitabilityReport = async (req, res) => {
    try {
        const { year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const monthlyData = [];

        for (let month = 1; month <= 12; month++) {
            const startDate = new Date(targetYear, month - 1, 1);
            const endDate = new Date(targetYear, month, 0);

            const salesResult = await Invoice.aggregate([
                {
                    $match: {
                        invoiceDate: { $gte: startDate, $lte: endDate },
                        status: { $ne: 'cancelled' }
                    }
                },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]);

            const expenseResult = await Expense.aggregate([
                {
                    $match: {
                        date: { $gte: startDate, $lte: endDate },
                        paymentStatus: 'paid'
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            const revenue = salesResult[0]?.total || 0;
            const expenses = expenseResult[0]?.total || 0;
            const profit = revenue - expenses;

            monthlyData.push({
                month,
                year: targetYear,
                revenue,
                expenses,
                profit,
                profitMargin: revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0
            });
        }

        res.json({
            profitabilityReport: monthlyData,
            year: targetYear,
            summary: {
                totalRevenue: monthlyData.reduce((sum, m) => sum + m.revenue, 0),
                totalExpenses: monthlyData.reduce((sum, m) => sum + m.expenses, 0),
                totalProfit: monthlyData.reduce((sum, m) => sum + m.profit, 0)
            }
        });

    } catch (error) {
        console.error('Error generating profitability report:', error);
        res.status(500).json({ error: 'Failed to generate profitability report' });
    }
};

// --- Audit & Verification ---

// Stock vs sales audit
exports.auditStockSalesReconciliation = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
        const end = endDate ? new Date(endDate) : new Date();

        // Get total sales volume by rice type
        const salesVolume = await Invoice.aggregate([
            {
                $match: {
                    invoiceDate: { $gte: start, $lte: end },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $unwind: '$items'
            },
            {
                $group: {
                    _id: '$items.productName',
                    totalSold: { $sum: '$items.qtyKg' }
                }
            }
        ]);

        // Get current inventory levels
        const currentInventory = await FinishedGoods.find()
            .select('paddyType riceGrade weightKg sku');

        const inventoryMapped = currentInventory.map(item => ({
            productName: item.paddyType + ' Rice - ' + item.riceGrade,
            currentStock: item.weightKg,
            sku: item.sku
        }));

        // Compare sales vs available stock
        const reconciliation = salesVolume.map(sale => {
            const matchingInventory = inventoryMapped.find(
                inv => inv.productName === sale._id
            );

            return {
                productName: sale._id,
                soldQty: sale.totalSold,
                currentStock: matchingInventory?.currentStock || 0,
                stockSufficiency: (matchingInventory?.currentStock || 0) >= sale.totalSold,
                variance: (matchingInventory?.currentStock || 0) - sale.totalSold
            };
        });

        res.json({
            stockAudit: reconciliation,
            period: { start, end },
            summary: {
                totalItemsAudited: reconciliation.length,
                itemsWithStockIssues: reconciliation.filter(item => item.variance < 0).length,
                overallStockStatus: reconciliation.every(item => item.stockSufficiency)
            }
        });

    } catch (error) {
        console.error('Error performing stock audit:', error);
        res.status(500).json({ error: 'Failed to perform stock audit' });
    }
};

// --- Customer & Supplier Accounts ---

// Update customer credit limit
exports.updateCustomerCreditLimit = async (req, res) => {
    try {
        const { customerId, newCreditLimit } = req.body;

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        customer.creditLimit = newCreditLimit;
        customer.creditLimitUpdatedBy = req.user.id;
        customer.creditLimitUpdatedAt = new Date();

        await customer.save();

        res.json({
            customer,
            message: 'Credit limit updated successfully'
        });

    } catch (error) {
        console.error('Error updating credit limit:', error);
        res.status(500).json({ error: 'Failed to update credit limit' });
    }
};

// Get customer transaction history
exports.getCustomerTransactionHistory = async (req, res) => {
    try {
        const { customerId } = req.params;

        const transactions = [];

        // Get all invoices for this customer (by name for now)
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const invoices = await Invoice.find({
            customerName: customer.name,
            status: { $ne: 'cancelled' }
        })
        .populate('billedBy', 'name')
        .populate('payments.processedBy', 'name')
        .sort({ invoiceDate: -1 });

        // Format transactions
        const invoiceTransactions = invoices.map(invoice => ({
            date: invoice.invoiceDate,
            type: 'invoice',
            reference: invoice.invoiceNumber,
            description: `Invoice ${invoice.invoiceNumber}`,
            amount: invoice.totalAmount,
            balance: invoice.totalAmount - (invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0),
            status: invoice.paymentStatus
        }));

        // Include payment transactions
        const paymentTransactions = invoices.flatMap(invoice =>
            invoice.payments?.map(payment => ({
                date: payment.paymentDate,
                type: 'payment',
                reference: invoice.invoiceNumber,
                description: `Payment for Invoice ${invoice.invoiceNumber}`,
                amount: -payment.amount, // Negative for payments received
                balance: 0,
                paymentMethod: payment.paymentMethod
            })) || []
        );

        const allTransactions = [...invoiceTransactions, ...paymentTransactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            customer,
            transactions: allTransactions,
            summary: {
                totalInvoices: invoices.length,
                totalOutstanding: allTransactions.reduce((sum, t) => sum + (t.balance || 0), 0),
                totalPaid: paymentTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
            }
        });

    } catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(500).json({ error: 'Failed to fetch transaction history' });
    }
};

// Send payment reminder
exports.sendPaymentReminder = async (req, res) => {
    try {
        const { customerId, invoiceIds } = req.body;

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Get outstanding invoices
        const invoices = await Invoice.find({
            _id: { $in: invoiceIds },
            paymentStatus: { $ne: 'paid' },
            status: { $ne: 'cancelled' }
        });

        // Record reminder sent
        for (const invoice of invoices) {
            if (!invoice.remindersSent) invoice.remindersSent = [];
            invoice.remindersSent.push({
                sentDate: new Date(),
                sentBy: req.user.id,
                type: 'payment_reminder'
            });
            await invoice.save();
        }

        res.json({
            customer,
            invoices,
            message: `Payment reminder sent to ${customer.name} for ${invoices.length} invoices`
        });

    } catch (error) {
        console.error('Error sending payment reminder:', error);
        res.status(500).json({ error: 'Failed to send payment reminder' });
    }
};
