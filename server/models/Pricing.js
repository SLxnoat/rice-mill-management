const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    pricePerKg: {
        type: Number,
        required: true,
        min: 0
    },
    effectiveFrom: {
        type: Date,
        required: true,
        default: Date.now
    },
    effectiveTo: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'active'
    },
    minOrderQuantity: {
        type: Number,
        default: 0
    },
    maxOrderQuantity: {
        type: Number
    },
    discountPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    notes: {
        type: String
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for faster queries
pricingSchema.index({ product: 1, effectiveFrom: -1 });
pricingSchema.index({ status: 1 });

// Method to check if pricing is currently valid
pricingSchema.methods.isValid = function () {
    const now = new Date();
    return (
        this.status === 'active' &&
        this.effectiveFrom <= now &&
        (!this.effectiveTo || this.effectiveTo >= now)
    );
};

// Static method to get current price for a product
pricingSchema.statics.getCurrentPrice = async function (productId) {
    const now = new Date();
    return await this.findOne({
        product: productId,
        status: 'active',
        effectiveFrom: { $lte: now },
        $or: [
            { effectiveTo: { $gte: now } },
            { effectiveTo: null }
        ]
    }).sort({ effectiveFrom: -1 });
};

module.exports = mongoose.model('Pricing', pricingSchema);
