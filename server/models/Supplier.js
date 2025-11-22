const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    contactPerson: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    district: {
        type: String,
        trim: true,
    },
    bankDetails: {
        bankName: String,
        accountNumber: String,
        branch: String,
        accountName: String,
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'blacklisted'],
        default: 'active',
    },
    notes: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
    indexes: [
        { name: 1 },
        { status: 1 },
        { district: 1 },
    ]
});

// Static methods
supplierSchema.statics.findActive = function () {
    return this.find({ status: 'active' }).sort({ name: 1 });
};

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = Supplier;
