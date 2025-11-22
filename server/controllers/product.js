const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const { category, active } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (active !== undefined) query.active = active === 'true';
    
    const products = await Product.find(query).sort({ category: 1, name: 1 });
    
    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message
    });
  }
};

// Get single product
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      error: 'Failed to fetch product',
      message: error.message
    });
  }
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { sku, name, category, unit, basePrice, costPrice, specifications } = req.body;
    
    // Generate SKU if not provided
    let productSKU = sku;
    if (!productSKU) {
      productSKU = await Product.generateSKU(
        category,
        specifications?.paddyType,
        specifications?.riceGrade,
        specifications?.bagWeight
      );
    }
    
    const product = new Product({
      sku: productSKU,
      name,
      category,
      unit,
      basePrice: basePrice || 0,
      costPrice: costPrice || 0,
      specifications: specifications || {},
      active: true
    });
    
    await product.save();
    
    res.status(201).json({
      success: true,
      product,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === 11000) {
      res.status(400).json({
        error: 'Duplicate SKU',
        message: 'A product with this SKU already exists'
      });
    } else {
      res.status(500).json({
        error: 'Failed to create product',
        message: error.message
      });
    }
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      error: 'Failed to update product',
      message: error.message
    });
  }
};

// Delete product (soft delete - set active to false)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }
    
    // Soft delete - set active to false
    product.active = false;
    await product.save();
    
    res.json({
      success: true,
      message: 'Product deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      error: 'Failed to delete product',
      message: error.message
    });
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.findByCategory(category);
    
    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message
    });
  }
};

