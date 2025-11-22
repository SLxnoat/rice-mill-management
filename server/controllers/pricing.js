const Pricing = require('../models/Pricing');

// Get all pricing records
exports.getPricings = async (req, res) => {
    try {
        const { product, status } = req.query;

        let query = {};
        if (product) query.product = product;
        if (status) query.status = status;

        const pricing = await Pricing.find(query)
            .populate('product', 'name category')
            .populate('updatedBy', 'name')
            .sort({ effectiveFrom: -1 });

        res.json({
            success: true,
            count: pricing.length,
            pricing
        });
    } catch (error) {
        console.error('Get pricing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pricing'
        });
    }
};

// Get current price for a product
exports.getCurrentPrice = async (req, res) => {
    try {
        const pricing = await Pricing.getCurrentPrice(req.params.productId);

        if (!pricing) {
            return res.status(404).json({
                success: false,
                error: 'No active pricing found for this product'
            });
        }

        res.json({
            success: true,
            pricing
        });
    } catch (error) {
        console.error('Get current price error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch current price'
        });
    }
};

// Create pricing
exports.createPricing = async (req, res) => {
    try {
        const pricing = await Pricing.create({
            ...req.body,
            updatedBy: req.user._id
        });

        const populatedPricing = await Pricing.findById(pricing._id)
            .populate('product', 'name category')
            .populate('updatedBy', 'name');

        res.status(201).json({
            success: true,
            pricing: populatedPricing
        });
    } catch (error) {
        console.error('Create pricing error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create pricing'
        });
    }
};

// Update pricing
exports.updatePricing = async (req, res) => {
    try {
        const pricing = await Pricing.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                updatedBy: req.user._id
            },
            { new: true, runValidators: true }
        ).populate('product', 'name category')
            .populate('updatedBy', 'name');

        if (!pricing) {
            return res.status(404).json({
                success: false,
                error: 'Pricing not found'
            });
        }

        res.json({
            success: true,
            pricing
        });
    } catch (error) {
        console.error('Update pricing error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update pricing'
        });
    }
};

// Delete pricing
exports.deletePricing = async (req, res) => {
    try {
        const pricing = await Pricing.findByIdAndDelete(req.params.id);

        if (!pricing) {
            return res.status(404).json({
                success: false,
                error: 'Pricing not found'
            });
        }

        res.json({
            success: true,
            message: 'Pricing deleted successfully'
        });
    } catch (error) {
        console.error('Delete pricing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete pricing'
        });
    }
};

// Get price history for a product
exports.getPriceHistory = async (req, res) => {
    try {
        const history = await Pricing.find({
            product: req.params.productId
        }).sort({ effectiveFrom: -1 });

        res.json({
            success: true,
            count: history.length,
            history
        });
    } catch (error) {
        console.error('Get price history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch price history'
        });
    }
};
