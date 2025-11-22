const MillSettings = require('../models/MillSettings');
const Invoice = require('../models/Invoice');
const ProductionBatch = require('../models/ProductionBatch');
const Purchase = require('../models/Purchase');

/**
 * Get next invoice number
 * Format: INV-YYYY-XXXX (e.g., INV-2024-0001)
 */
async function getNextInvoiceNumber() {
  const settings = await MillSettings.findOne();
  const year = new Date().getFullYear();
  const prefix = settings?.invoicePrefix || 'INV';
  
  // Find last invoice for this year
  const lastInvoice = await Invoice.findOne({
    invoiceNumber: new RegExp(`^${prefix}-${year}-`)
  }).sort({ invoiceNumber: -1 });
  
  let nextNumber = 1;
  if (lastInvoice) {
    const match = lastInvoice.invoiceNumber.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  
  const numberFormat = settings?.invoiceNumberFormat || '4'; // 4 digits
  const paddedNumber = String(nextNumber).padStart(parseInt(numberFormat), '0');
  
  return `${prefix}-${year}-${paddedNumber}`;
}

/**
 * Get next batch number
 * Format: BATCH-YYYY-XXXX (e.g., BATCH-2024-0001)
 */
async function getNextBatchNumber() {
  const settings = await MillSettings.findOne();
  const year = new Date().getFullYear();
  const prefix = settings?.batchPrefix || 'BATCH';
  
  // Find last batch for this year
  const lastBatch = await ProductionBatch.findOne({
    $or: [
      { batchNumber: new RegExp(`^${prefix}-${year}-`) },
      { batchId: new RegExp(`^${prefix}-${year}-`) }
    ]
  }).sort({ createdAt: -1 });
  
  let nextNumber = 1;
  if (lastBatch) {
    const batchNum = lastBatch.batchNumber || lastBatch.batchId;
    const match = batchNum.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  
  const numberFormat = settings?.batchNumberFormat || '4';
  const paddedNumber = String(nextNumber).padStart(parseInt(numberFormat), '0');
  
  return `${prefix}-${year}-${paddedNumber}`;
}

/**
 * Get next purchase order number
 * Format: PO-YYYY-XXXX (e.g., PO-2024-0001)
 */
async function getNextPONumber() {
  const settings = await MillSettings.findOne();
  const year = new Date().getFullYear();
  const prefix = settings?.poPrefix || 'PO';
  
  // Find last purchase order for this year
  const lastPO = await Purchase.findOne({
    poNumber: new RegExp(`^${prefix}-${year}-`)
  }).sort({ poNumber: -1 });
  
  let nextNumber = 1;
  if (lastPO) {
    const match = lastPO.poNumber.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  
  const numberFormat = settings?.poNumberFormat || '4';
  const paddedNumber = String(nextNumber).padStart(parseInt(numberFormat), '0');
  
  return `${prefix}-${year}-${paddedNumber}`;
}

/**
 * Get next sales order number
 * Format: SO-YYYY-XXXX (e.g., SO-2024-0001)
 */
async function getNextSalesOrderNumber() {
  const SalesOrder = require('../models/SalesOrder');
  const settings = await MillSettings.findOne();
  const year = new Date().getFullYear();
  const prefix = settings?.salesOrderPrefix || 'SO';
  
  // Find last sales order for this year
  const lastOrder = await SalesOrder.findOne({
    orderNumber: new RegExp(`^${prefix}-${year}-`)
  }).sort({ orderNumber: -1 });
  
  let nextNumber = 1;
  if (lastOrder) {
    const match = lastOrder.orderNumber.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  
  const numberFormat = settings?.salesOrderNumberFormat || '4';
  const paddedNumber = String(nextNumber).padStart(parseInt(numberFormat), '0');
  
  return `${prefix}-${year}-${paddedNumber}`;
}

/**
 * Initialize auto-numbering settings if not exists
 */
async function initializeAutoNumbering() {
  const settings = await MillSettings.findOne();
  if (!settings) {
    const defaultSettings = new MillSettings({
      invoicePrefix: 'INV',
      invoiceNumberFormat: '4',
      batchPrefix: 'BATCH',
      batchNumberFormat: '4',
      poPrefix: 'PO',
      poNumberFormat: '4',
      salesOrderPrefix: 'SO',
      salesOrderNumberFormat: '4',
    });
    await defaultSettings.save();
  } else {
    // Set defaults if missing
    if (!settings.invoicePrefix) settings.invoicePrefix = 'INV';
    if (!settings.invoiceNumberFormat) settings.invoiceNumberFormat = '4';
    if (!settings.batchPrefix) settings.batchPrefix = 'BATCH';
    if (!settings.batchNumberFormat) settings.batchNumberFormat = '4';
    if (!settings.poPrefix) settings.poPrefix = 'PO';
    if (!settings.poNumberFormat) settings.poNumberFormat = '4';
    if (!settings.salesOrderPrefix) settings.salesOrderPrefix = 'SO';
    if (!settings.salesOrderNumberFormat) settings.salesOrderNumberFormat = '4';
    await settings.save();
  }
}

module.exports = {
  getNextInvoiceNumber,
  getNextBatchNumber,
  getNextPONumber,
  getNextSalesOrderNumber,
  initializeAutoNumbering
};

