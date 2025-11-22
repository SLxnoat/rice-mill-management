const mongoose = require('mongoose');

const productionBatchSchema = new mongoose.Schema({
    batchNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
    },
    batchId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
    },
    paddyType: {
        type: String,
        enum: ['nadu', 'samba', 'mixed'],
    },
    paddyBreakdown: {
        nadu: { type: Number, min: 0, default: 0 },
        samba: { type: Number, min: 0, default: 0 },
    },
    inputQuantityKg: {
        type: Number,
        required: true,
        min: 0,
    },
    inputPaddyKg: {
        type: Number,
        min: 0,
    },
    rawMaterialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterials',
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    startTime: {
        type: Date,
        default: Date.now,
    },
    endedAt: {
        type: Date,
    },
    endTime: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['queued', 'in_progress', 'running', 'completed', 'cancelled'],
        default: 'in_progress',
    },
    output: {
        riceWeightKg: { type: Number, min: 0 },
        outputRiceKg: { type: Number, min: 0 },
        brokenRiceKg: { type: Number, min: 0 },
        brokenKg: { type: Number, min: 0 },
        branKg: { type: Number, min: 0 },
        huskKg: { type: Number, min: 0 },
        impurityKg: { type: Number, min: 0 },
    },
    yieldPercentage: {
        type: Number,
        min: 0,
        max: 100,
    },
    operatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    operatorIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    machineIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Machine',
    }],
    notes: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
    indexes: [
        { batchNumber: 1 },
        { batchId: 1 },
        { status: 1 },
        { startedAt: 1 },
        { startTime: 1 },
        { operatorIds: 1 },
        { machineIds: 1 },
    ]
});

// Calculate yield percentage before saving if output exists
productionBatchSchema.pre('save', function (next) {
    // Sync inputPaddyKg with inputQuantityKg if not set
    if (!this.inputPaddyKg && this.inputQuantityKg) {
        this.inputPaddyKg = this.inputQuantityKg;
    }
    
    // Sync paddyBreakdown with paddyType if needed
    if (this.paddyType && !this.paddyBreakdown.nadu && !this.paddyBreakdown.samba) {
        if (this.paddyType === 'nadu') {
            this.paddyBreakdown.nadu = this.inputQuantityKg;
        } else if (this.paddyType === 'samba') {
            this.paddyBreakdown.samba = this.inputQuantityKg;
        }
    }
    
    // Sync output fields
    if (this.output) {
        if (this.output.riceWeightKg && !this.output.outputRiceKg) {
            this.output.outputRiceKg = this.output.riceWeightKg;
        }
        if (this.output.brokenRiceKg && !this.output.brokenKg) {
            this.output.brokenKg = this.output.brokenRiceKg;
        }
    }
    
    // Calculate yield percentage
    const riceOutput = this.output?.outputRiceKg || this.output?.riceWeightKg;
    const input = this.inputPaddyKg || this.inputQuantityKg;
    if (riceOutput && input) {
        this.yieldPercentage = (riceOutput / input) * 100;
    }
    
    // Sync startedAt with startTime
    if (this.startTime && !this.startedAt) {
        this.startedAt = this.startTime;
    }
    if (this.endTime && !this.endedAt) {
        this.endedAt = this.endTime;
    }
    
    // Set batchNumber from batchId if not set
    if (this.batchId && !this.batchNumber) {
        this.batchNumber = this.batchId;
    }
    
    next();
});

const ProductionBatch = mongoose.model('ProductionBatch', productionBatchSchema);

module.exports = ProductionBatch;
