const mongoose = require('mongoose');

const millSettingsSchema = new mongoose.Schema({
    millName: {
        type: String,
        required: true,
        default: 'KMG Rice Mill',
        trim: true
    },
    address: {
        street: { type: String, default: 'Industrial Area, Sector 5' },
        city: { type: String, default: 'Mumbai' },
        state: { type: String, default: 'Maharashtra' },
        pincode: { type: String, default: '400001' },
        country: { type: String, default: 'India' }
    },
    contact: {
        phone: { type: String, default: '+91 22 1234 5678' },
        mobile: { type: String, default: '+91 98765 43210' },
        email: { type: String, default: 'info@kmgricemill.com' },
        website: { type: String, default: 'www.kmgricemill.com' }
    },
    gst: {
        number: { type: String, default: '27AABCK1234F1Z5' },
        enabled: { type: Boolean, default: true }
    },

    // === BUSINESS CALCULATION PARAMETERS ===

    // Milling Parameters
    millingRecoveryRate: {
        type: Number,
        default: 0.67, // 67% - paddy to rice conversion
        min: 0.5,
        max: 0.8,
    },

    // By-Product Yield Rates (percentage of paddy input)
    huskYieldRate: {
        type: Number,
        default: 0.20, // 20% husk
        min: 0.15,
        max: 0.25,
    },
    branYieldRate: {
        type: Number,
        default: 0.08, // 8% bran
        min: 0.05,
        max: 0.12,
    },
    brokenRiceRate: {
        type: Number,
        default: 0.05, // 5% broken rice
        min: 0.02,
        max: 0.10,
    },

    // Pricing & Profit
    targetProfitMargin: {
        type: Number,
        default: 0.15, // 15% profit margin for pricing
        min: 0.05,
        max: 0.50,
    },
    ownerSalaryPercentage: {
        type: Number,
        default: 0.25, // 25% of net profit before owner salary
        min: 0.10,
        max: 0.40,
    },

    // Labor Costs
    labourDailyRate: {
        type: Number,
        default: 500, // ₹500 per day per labour
    },
    numberOfLabourers: {
        type: Number,
        default: 5,
    },
    workDaysPerMonth: {
        type: Number,
        default: 26,
    },
    driverMonthlySalary: {
        type: Number,
        default: 15000,
    },
    numberOfDrivers: {
        type: Number,
        default: 2,
    },

    // Fixed Monthly Costs (OPEX)
    monthlyLoanPayment: {
        type: Number,
        default: 0,
    },
    electricityCost: {
        type: Number,
        default: 0,
    },
    waterCost: {
        type: Number,
        default: 0,
    },
    cctvCost: {
        type: Number,
        default: 0,
    },
    wifiCost: {
        type: Number,
        default: 0,
    },

    // Machine Depreciation
    machines: [{
        name: String,
        purchaseCost: Number,
        scrapValue: { type: Number, default: 0 },
        usefulLifeYears: { type: Number, default: 10 },
        monthlyDepreciation: Number, // Auto-calculated
    }],

    // By-Product Pricing
    huskSellingPrice: {
        type: Number,
        default: 5, // ₹5 per kg
    },
    branSellingPrice: {
        type: Number,
        default: 20, // ₹20 per kg
    },
    brokenRiceSellingPrice: {
        type: Number,
        default: 25, // ₹25 per kg
    },

    // Auto-numbering Prefixes
    invoicePrefix: {
        type: String,
        default: 'INV',
        trim: true
    },
    invoiceNumberFormat: {
        type: String,
        default: '4', // Number of digits
    },
    batchPrefix: {
        type: String,
        default: 'BATCH',
        trim: true
    },
    batchNumberFormat: {
        type: String,
        default: '4',
    },
    poPrefix: {
        type: String,
        default: 'PO',
        trim: true
    },
    poNumberFormat: {
        type: String,
        default: '4',
    },
    salesOrderPrefix: {
        type: String,
        default: 'SO',
        trim: true
    },
    salesOrderNumberFormat: {
        type: String,
        default: '4',
    },
    invoiceHeader: {
        type: String,
        default: '',
    },
    invoiceFooter: {
        type: String,
        default: 'Thank you for your business!',
    },
    currency: {
        type: String,
        default: 'LKR',
        trim: true
    },
    currencySymbol: {
        type: String,
        default: 'Rs',
        trim: true
    },
    logo: {
        type: String, // URL or base64
        default: ''
    },
    bankDetails: {
        bankName: { type: String, default: 'State Bank of India' },
        accountNumber: { type: String, default: '1234567890' },
        ifscCode: { type: String, default: 'SBIN0001234' },
        branch: { type: String, default: 'Mumbai Main Branch' }
    },
    taxSettings: {
        gstRate: { type: Number, default: 5, min: 0, max: 100 }, // Default 5% GST
        cgst: { type: Number, default: 2.5, min: 0, max: 100 },
        sgst: { type: Number, default: 2.5, min: 0, max: 100 }
    }
}, {
    timestamps: true
});

// Virtual: Calculate total monthly labor cost
millSettingsSchema.virtual('monthlyLabourCost').get(function () {
    return this.labourDailyRate * this.numberOfLabourers * this.workDaysPerMonth;
});

// Virtual: Calculate total monthly driver cost
millSettingsSchema.virtual('monthlyDriverCost').get(function () {
    return this.driverMonthlySalary * this.numberOfDrivers;
});

// Virtual: Calculate total monthly fixed costs (utilities + loan)
millSettingsSchema.virtual('monthlyFixedCosts').get(function () {
    return this.monthlyLoanPayment +
        this.electricityCost +
        this.waterCost +
        this.cctvCost +
        this.wifiCost;
});

// Virtual: Calculate total monthly OPEX (fixed + labor)
millSettingsSchema.virtual('totalMonthlyOPEX').get(function () {
    return this.monthlyFixedCosts +
        this.monthlyLabourCost +
        this.monthlyDriverCost;
});

// Auto-calculate machine depreciation before save
millSettingsSchema.pre('save', function (next) {
    if (this.machines && this.machines.length > 0) {
        this.machines.forEach(machine => {
            if (machine.purchaseCost && machine.usefulLifeYears) {
                const annualDepreciation = (machine.purchaseCost - (machine.scrapValue || 0)) / machine.usefulLifeYears;
                machine.monthlyDepreciation = annualDepreciation / 12;
            }
        });
    }
    next();
});

// Ensure only one settings document exists
millSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        // Create default settings if none exist
        settings = await this.create({});
    }
    return settings;
};

millSettingsSchema.statics.updateSettings = async function (updates) {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create(updates);
    } else {
        Object.assign(settings, updates);
        await settings.save();
    }
    return settings;
};

millSettingsSchema.set('toJSON', { virtuals: true });
millSettingsSchema.set('toObject', { virtuals: true });

const MillSettings = mongoose.model('MillSettings', millSettingsSchema);

module.exports = MillSettings;
