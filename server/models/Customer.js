const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    contactPerson: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String
    },
    gstNumber: {
        type: String,
        trim: true,
        uppercase: true
    },
    creditLimit: {
        type: Number,
        default: 0
    },
    outstandingAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'blocked'],
        default: 'active'
    },
    paymentTerms: {
        type: String,
        enum: ['cash', 'credit_7days', 'credit_15days', 'credit_30days'],
        default: 'cash'
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

// Index for faster queries
customerSchema.index({ name: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ status: 1 });

// Method to update outstanding amount
customerSchema.methods.updateOutstanding = async function (amount) {
    this.outstandingAmount += amount;
    await this.save();
    return this;
};

// Method to check credit availability
customerSchema.methods.canExtendCredit = function (amount) {
    return (this.outstandingAmount + amount) <= this.creditLimit;
};

module.exports = mongoose.model('Customer', customerSchema);
