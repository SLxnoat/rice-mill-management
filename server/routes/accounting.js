const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { requireFinance, requireRead } = require('../middlewares/role');
const { body } = require('express-validator');
const accountingController = require('../controllers/accounting');

// All routes require authentication
router.use(authenticate);

// Finance routes: admin, accountant (write access)
// Others can view (read-only) - handled per route

// --- Invoice & Billing Management ---
// View: all authenticated users (read-only)
router.get('/invoices', requireRead, accountingController.getInvoicesAccounting);
router.get('/invoices/:id', requireRead, accountingController.getInvoiceById);

// Edit: admin, accountant
router.put('/invoices/:id', requireFinance, [
    body('discountPercent', 'Discount percent must be between 0 and 100').optional().isFloat({ min: 0, max: 100 }),
    body('taxPercent', 'Tax percent must be between 0 and 100').optional().isFloat({ min: 0, max: 100 }),
], accountingController.editInvoice);
router.patch('/invoices/:id/cancel', requireFinance, accountingController.cancelInvoice);

// Payment recording: admin, accountant
router.post('/invoices/:id/payments', requireFinance, [
    body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be positive'),
    body('paymentMethod').isIn(['cash', 'cheque', 'bank_transfer', 'online']).withMessage('Invalid payment method'),
], accountingController.recordInvoicePayment);

// --- Payment Management ---
// View: all authenticated users (read-only)
router.get('/payments/customers', requireRead, accountingController.getCustomerPayments);
router.get('/balances/customers', requireRead, accountingController.getCustomerBalances);

// Approve: admin, accountant
router.post('/settlements/approve', requireFinance, accountingController.approveOutstandingSettlement);

// --- Expense Management ---
// View: all authenticated users (read-only)
router.get('/expenses', requireRead, accountingController.getExpenses);
router.get('/expenses/summary', requireRead, accountingController.getExpenseSummary);
router.get('/expenses/:id', requireRead, accountingController.getExpenseById);

// Create/update/delete: admin, accountant
router.post('/expenses', requireFinance, [
    body('type').isIn(['fuel', 'utilities', 'repair', 'maintenance', 'salary', 'supplies', 'transport', 'insurance', 'taxes', 'cash_outflow']),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').isIn(['operational', 'maintenance', 'administrative', 'production', 'marketing', 'cash_transaction']),
], accountingController.createExpense);

router.put('/expenses/:id', requireFinance, accountingController.updateExpense);
router.delete('/expenses/:id', requireFinance, accountingController.deleteExpense);

// --- Purchase & Expense Management ---
// Admin, accountant only
router.put('/purchases/:id/costs', requireFinance, [
    body('transportCost').optional().isFloat({ min: 0 }),
    body('labourCost').optional().isFloat({ min: 0 }),
    body('packagingCost').optional().isFloat({ min: 0 }),
    body('handlingCharges').optional().isFloat({ min: 0 }),
], accountingController.addPurchaseCosts);

// --- Cashflow Management ---
// View: all authenticated users (read-only)
router.get('/cashflow/balance', requireRead, accountingController.getCashBalance);

// Record: admin, accountant
router.post('/cashflow/transactions', requireFinance, accountingController.recordCashTransaction);

// --- Financial Dashboard ---
// View: all authenticated users (read-only)
router.get('/dashboard/financial', requireRead, accountingController.getFinancialOverview);

// --- Loan & Liability Tracking ---
// View: all authenticated users (read-only)
router.get('/loans/summary', requireRead, accountingController.getLoanSummary);

// Record: admin, accountant
router.post('/loans', requireFinance, accountingController.recordLoan);
router.post('/loans/:loanId/payments', requireFinance, accountingController.recordLoanPayment);
router.post('/assets', requireFinance, accountingController.recordAssetPurchase);

// --- Profit & Cost Analysis ---
// View: all authenticated users (read-only)
router.get('/analysis/cost-per-kg', requireRead, accountingController.getCostPerKgAnalysis);
router.get('/analysis/profit-by-product', requireRead, accountingController.getProfitByProduct);

// --- Enhanced Financial Reports ---
// View: all authenticated users (read-only)
router.get('/reports/sales', requireRead, accountingController.getDetailedSalesReport);
router.get('/reports/expenses', requireRead, accountingController.getExpenseBreakdownReport);
router.get('/reports/profitability', requireRead, accountingController.getProfitabilityReport);

// --- Audit & Verification ---
// View: all authenticated users (read-only)
router.get('/audit/stock-sales', requireRead, accountingController.auditStockSalesReconciliation);

// --- Customer & Supplier Accounts ---
// View: all authenticated users (read-only)
router.get('/customers/:customerId/transactions', requireRead, accountingController.getCustomerTransactionHistory);

// Update: admin, accountant
router.put('/customers/:customerId/credit-limit', requireFinance, accountingController.updateCustomerCreditLimit);
router.post('/customers/:customerId/reminders', requireFinance, accountingController.sendPaymentReminder);

module.exports = router;
