const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const productController = require('../controllers/product');
const { authenticate } = require('../middlewares/auth');
const { checkRoles } = require('../middlewares/role');

// All routes require authentication
router.use(authenticate);

// Get all products
router.get('/', productController.getProducts);

// Get products by category
router.get('/category/:category', productController.getProductsByCategory);

// Get single product
router.get('/:id', productController.getProductById);

// Create product (admin only)
router.post('/',
  checkRoles('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('category').isIn(['raw', 'finished', 'byproduct']).withMessage('Invalid category'),
    body('unit').isIn(['kg', 'bag', 'piece', 'liters']).withMessage('Invalid unit'),
    body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
    body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  ],
  productController.createProduct
);

// Update product (admin only)
router.put('/:id',
  checkRoles('admin'),
  productController.updateProduct
);

// Delete product (admin only - soft delete)
router.delete('/:id',
  checkRoles('admin'),
  productController.deleteProduct
);

module.exports = router;

