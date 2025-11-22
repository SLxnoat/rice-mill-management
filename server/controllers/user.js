const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Get all users with filtering and pagination
 */
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      status,
      search
    } = req.query;

    const query = {};

    // Apply filters
    if (role) query.role = role;
    if (status) query.status = status === 'true' ? true : status === 'false' ? false : status;

    // Search by name or email
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single user by ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-passwordHash').lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new user
 */
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Name, email, password, and role are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Validate role
    const validRoles = ['admin', 'accountant', 'sales_manager', 'operator', 'labour', 'warehouse_manager', 'driver'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      phone: phone ? phone.trim() : null
    });

    await user.save();

    // Return user without password hash
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an existing user
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, phone, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for email conflict if email is being changed
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email.toLowerCase().trim();
    }

    // Prevent users from deactivating themselves
    if (status === 'inactive' && id === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    // Update fields if provided
    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone ? phone.trim() : null;
    if (role !== undefined) {
      const validRoles = ['admin', 'accountant', 'sales_manager', 'operator', 'labour', 'warehouse_manager', 'driver'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified' });
      }
      // Prevent users from changing their own role
      if (id === req.user.id && role !== user.role) {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }
      user.role = role;
    }
    if (status !== undefined) user.status = status;

    // Update password if provided
    if (password && password.trim()) {
      const saltRounds = 10;
      user.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    await user.save();

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      message: 'User updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a user (soft delete by setting status to inactive)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deletion of self
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if this is the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', _id: { $ne: id }, status: 'active' });
      if (adminCount === 0) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    // Soft delete by setting status to inactive instead of hard delete
    user.status = 'inactive';
    await user.save();

    res.json({ message: 'User deactivated successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user statistics
 */
const getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
          byRole: {
            $push: '$role'
          }
        }
      },
      {
        $project: {
          total: 1,
          active: 1,
          inactive: 1,
          roles: {
            admin: {
              $size: {
                $filter: {
                  input: '$byRole',
                  cond: { $eq: ['$$this', 'admin'] }
                }
              }
            },
            accountant: {
              $size: {
                $filter: {
                  input: '$byRole',
                  cond: { $eq: ['$$this', 'accountant'] }
                }
              }
            },
            sales_manager: {
              $size: {
                $filter: {
                  input: '$byRole',
                  cond: { $eq: ['$$this', 'sales_manager'] }
                }
              }
            },
            operator: {
              $size: {
                $filter: {
                  input: '$byRole',
                  cond: { $eq: ['$$this', 'operator'] }
                }
              }
            },
            labour: {
              $size: {
                $filter: {
                  input: '$byRole',
                  cond: { $eq: ['$$this', 'labour'] }
                }
              }
            },
            warehouse_manager: {
              $size: {
                $filter: {
                  input: '$byRole',
                  cond: { $eq: ['$$this', 'warehouse_manager'] }
                }
              }
            },
            driver: {
              $size: {
                $filter: {
                  input: '$byRole',
                  cond: { $eq: ['$$this', 'driver'] }
                }
              }
            }
          }
        }
      }
    ]);

    res.json({ stats: stats[0] || { total: 0, active: 0, inactive: 0, roles: { admin: 0, accountant: 0, sales_manager: 0, operator: 0, labour: 0, warehouse_manager: 0, driver: 0 } } });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
};
