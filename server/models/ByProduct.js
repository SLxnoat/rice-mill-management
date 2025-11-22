const mongoose = require('mongoose');

const byProductSchema = new mongoose.Schema({
    productionBatchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductionBatch',
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['husk', 'bran', 'broken_rice'],
    },
    quantityKg: {
        type: Number,
        required: true,
        min: 0,
    },
    costPerKg: {
        type: Number,
        default: 0, // Cost allocated from production (optional)
    },
    sellingPricePerKg: {
        type: Number,
        required: true,
        min: 0,
    },
    totalValue: {
        type: Number,
        default: 0, // Auto-calculated: quantityKg * sellingPricePerKg
    },

    // Sales tracking
    soldQuantity: {
        type: Number,
        default: 0,
        min: 0,
    },
    soldRevenue: {
        type: Number,
        default: 0,
    },
    stockBalance: {
        type: Number,
        default: 0, // quantityKg - soldQuantity
    },

    // Storage
    storageBinId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StorageBin',
    },

    // Metadata
    productionDate: {
        type: Date,
        required: true,
    },
    expiryDate: {
        type: Date, // Optional, for shelf-life tracking
    },
    quality: {
        type: String,
        enum: ['A', 'B', 'C'],
        default: 'A',
    },
    remarks: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['in_stock', 'partially_sold', 'sold_out', 'expired'],
        default: 'in_stock',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

// Auto-calculate totalValue and stockBalance before save
byProductSchema.pre('save', function (next) {
    // Calculate total value
    this.totalValue = this.quantityKg * this.sellingPricePerKg;

    // Calculate stock balance
    this.stockBalance = this.quantityKg - this.soldQuantity;

    // Update status based on stock
    if (this.stockBalance <= 0) {
        this.status = 'sold_out';
    } else if (this.soldQuantity > 0) {
        this.status = 'partially_sold';
    } else {
        this.status = 'in_stock';
    }

    next();
});

// Indexes
byProductSchema.index({ productionBatchId: 1 });
byProductSchema.index({ type: 1 });
byProductSchema.index({ status: 1 });
byProductSchema.index({ productionDate: -1 });

// Virtual for profit (if cost tracking enabled)
byProductSchema.virtual('profit').get(function () {
    if (this.costPerKg > 0) {
        return (this.sellingPricePerKg - this.costPerKg) * this.soldQuantity;
    }
    return this.soldRevenue; // If no cost tracking, revenue = profit
});

// Static: Get total by-product revenue for a period
byProductSchema.statics.getRevenueForPeriod = async function (startDate, endDate, type = null) {
    const query = {
        productionDate: { $gte: startDate, $lte: endDate },
    };

    if (type) {
        query.type = type;
    }

    const result = await this.aggregate([
        { $match: query },
        { $group: { _id: null, totalRevenue: { $sum: '$soldRevenue' } } },
    ]);

    return result.length > 0 ? result[0].totalRevenue : 0;
};

// Static: Get stock summary by type
byProductSchema.statics.getStockSummary = async function () {
    return await this.aggregate([
        { $match: { status: { $in: ['in_stock', 'partially_sold'] } } },
        {
            $group: {
                _id: '$type',
                totalStock: { $sum: '$stockBalance' },
                totalValue: { $sum: { $multiply: ['$stockBalance', '$sellingPricePerKg'] } },
                count: { $sum: 1 },
            },
        },
    ]);
};

// Static: Record a sale of by-product
byProductSchema.statics.recordSale = async function (byProductId, quantitySold, salePrice) {
    const byProduct = await this.findById(byProductId);
    if (!byProduct) throw new Error('By-product not found');

    if (quantitySold > byProduct.stockBalance) {
        throw new Error('Insufficient stock balance');
    }

    byProduct.soldQuantity += quantitySold;
    byProduct.soldRevenue += (salePrice || byProduct.sellingPricePerKg) * quantitySold;

    await byProduct.save(); // Triggers pre-save to update balance and status

    return byProduct;
};

byProductSchema.set('toJSON', { virtuals: true });
byProductSchema.set('toObject', { virtuals: true });

const ByProduct = mongoose.model('ByProduct', byProductSchema);

module.exports = ByProduct;
