const Supplier = require('../models/Supplier');

/**
 * Get all suppliers
 */
const getSuppliers = async (req, res) => {
    try {
        const { status, search } = req.query;
        const query = {};

        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { contactPerson: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        const suppliers = await Supplier.find(query).sort({ createdAt: -1 });
        res.json({ suppliers });
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get single supplier
 */
const getSupplierById = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json({ supplier });
    } catch (error) {
        console.error('Get supplier error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Create new supplier
 */
const createSupplier = async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone are required' });
        }

        const existingSupplier = await Supplier.findOne({ name: name.trim() });
        if (existingSupplier) {
            return res.status(400).json({ error: 'Supplier with this name already exists' });
        }

        const supplier = new Supplier(req.body);
        await supplier.save();

        res.status(201).json({
            supplier,
            message: 'Supplier created successfully'
        });
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update supplier
 */
const updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        res.json({
            supplier,
            message: 'Supplier updated successfully'
        });
    } catch (error) {
        console.error('Update supplier error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Delete supplier (soft delete preferred, but hard delete for now if unused)
 * Ideally should check for dependencies (Purchases) before deleting.
 */
const deleteSupplier = async (req, res) => {
    try {
        // Check if supplier has purchases (TODO: Import Purchase model when available to check)
        // For now, just soft delete by setting status to inactive if we wanted safety,
        // but requirement implies CRUD. Let's do hard delete but we should be careful.
        // Better: Set status to 'inactive' if they have history, or allow delete if no history.

        const supplier = await Supplier.findByIdAndDelete(req.params.id);

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        console.error('Delete supplier error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
};
