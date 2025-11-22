const Customer = require('../models/Customer');

// Get all customers
exports.getCustomers = async (req, res) => {
    try {
        const { status, search } = req.query;

        let query = {};

        // Filter by status if provided
        if (status) {
            query.status = status;
        }

        // Search by name, phone, or email
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const customers = await Customer.find(query)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: customers.length,
            customers
        });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customers'
        });
    }
};

// Get single customer
exports.getCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }

        res.json({
            success: true,
            customer
        });
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customer'
        });
    }
};

// Create customer
exports.createCustomer = async (req, res) => {
    try {
        const customer = await Customer.create(req.body);

        res.status(201).json({
            success: true,
            customer
        });
    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create customer'
        });
    }
};

// Update customer
exports.updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }

        res.json({
            success: true,
            customer
        });
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update customer'
        });
    }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }

        // Check if customer has outstanding amount
        if (customer.outstandingAmount > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete customer with outstanding amount'
            });
        }

        await Customer.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Customer deleted successfully'
        });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete customer'
        });
    }
};

// Get customer statistics
exports.getCustomerStats = async (req, res) => {
    try {
        const totalCustomers = await Customer.countDocuments();
        const activeCustomers = await Customer.countDocuments({ status: 'active' });
        const totalOutstanding = await Customer.aggregate([
            { $group: { _id: null, total: { $sum: '$outstandingAmount' } } }
        ]);

        res.json({
            success: true,
            stats: {
                totalCustomers,
                activeCustomers,
                inactiveCustomers: totalCustomers - activeCustomers,
                totalOutstanding: totalOutstanding[0]?.total || 0
            }
        });
    } catch (error) {
        console.error('Get customer stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customer statistics'
        });
    }
};

// Get customers with outstanding
exports.getOutstandingCustomers = async (req, res) => {
    try {
        const customers = await Customer.find({
            outstandingAmount: { $gt: 0 }
        }).sort({ outstandingAmount: -1 });

        res.json({
            success: true,
            count: customers.length,
            customers
        });
    } catch (error) {
        console.error('Get outstanding customers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch outstanding customers'
        });
    }
};
