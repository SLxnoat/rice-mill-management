const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { requireUserManagement, requireAdmin } = require('../middlewares/role');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/user');

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/v1/users/statistics - Get user statistics (admin only)
router.get('/statistics', requireAdmin, getUserStats);

// GET /api/v1/users - Get all users with pagination and filtering
router.get('/', requireUserManagement, getUsers);

// POST /api/v1/users - Create a new user (admin only)
router.post('/', requireAdmin, createUser);

// GET /api/v1/users/:id - Get a single user
router.get('/:id', requireUserManagement, getUserById);

// PUT /api/v1/users/:id - Update a user (admin only)
router.put('/:id', requireAdmin, updateUser);

// DELETE /api/v1/users/:id - Delete a user (admin only)
router.delete('/:id', requireAdmin, deleteUser);

module.exports = router;
