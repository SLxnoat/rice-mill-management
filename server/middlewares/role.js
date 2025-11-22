/**
 * Role-Based Access Control Middleware
 * Implements RBAC based on role definitions:
 * 
 * admin - everything (full access)
 * accountant - finance, invoices, payments, payroll, view everything else read-only
 * sales_manager - customers, orders, invoices (create), view stock read-only
 * operator - production operations, mark batch start/complete
 * warehouse_manager - inventory in/out, stock adjustments (admin approved)
 * driver - view assigned deliveries, mark delivered
 */

const checkRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions. Required roles: ' + allowedRoles.join(', ')
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const requireAdmin = checkRoles('admin');

/**
 * Check if user can read (all authenticated users can read)
 */
const requireRead = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * Check if user can write (admin always can, others based on role)
 */
const requireWrite = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin can always write
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user's role is in allowed roles
    if (allowedRoles && allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: 'Write access denied. Required roles: ' + (allowedRoles || []).join(', ')
    });
  };
};

/**
 * Finance operations: admin, accountant
 */
const requireFinance = checkRoles('admin', 'accountant');

/**
 * Sales operations: admin, sales_manager, accountant (for invoices)
 */
const requireSales = checkRoles('admin', 'sales_manager', 'accountant');

/**
 * Production operations: admin, operator
 */
const requireProduction = checkRoles('admin', 'operator');

/**
 * Warehouse operations: admin, warehouse_manager
 */
const requireWarehouse = checkRoles('admin', 'warehouse_manager');

/**
 * Driver operations: admin, driver
 */
const requireDriver = checkRoles('admin', 'driver');

/**
 * Customer management: admin, sales_manager
 */
const requireCustomerManagement = checkRoles('admin', 'sales_manager');

/**
 * Invoice creation: admin, sales_manager, accountant
 */
const requireInvoiceCreate = checkRoles('admin', 'sales_manager', 'accountant');

/**
 * Stock adjustments: admin only (warehouse_manager needs admin approval)
 */
const requireStockAdjustment = checkRoles('admin');

/**
 * User management: admin only
 */
const requireUserManagement = checkRoles('admin');

/**
 * Payroll: admin, accountant
 */
const requirePayroll = checkRoles('admin', 'accountant');

/**
 * Get user's available features based on role
 */
const getUserFeatures = (userRole) => {
  const features = {
    admin: {
      read: [
        'users', 'suppliers', 'customers', 'inventory', 'production', 
        'sales', 'invoices', 'payments', 'payroll', 'reports', 
        'maintenance', 'settings', 'deliveries'
      ],
      write: [
        'users', 'suppliers', 'customers', 'inventory', 'production', 
        'sales', 'invoices', 'payments', 'payroll', 'reports', 
        'maintenance', 'settings', 'deliveries', 'stock_adjustments'
      ]
    },
    accountant: {
      read: [
        'users', 'suppliers', 'customers', 'inventory', 'production', 
        'sales', 'invoices', 'payments', 'payroll', 'reports', 
        'maintenance', 'deliveries'
      ],
      write: [
        'invoices', 'payments', 'payroll', 'reports', 'finance'
      ]
    },
    sales_manager: {
      read: [
        'customers', 'inventory', 'sales', 'invoices', 'deliveries'
      ],
      write: [
        'customers', 'sales', 'invoices', 'deliveries'
      ]
    },
    operator: {
      read: [
        'production', 'inventory'
      ],
      write: [
        'production'
      ]
    },
    warehouse_manager: {
      read: [
        'inventory', 'storage_bins', 'products', 'inventory_movements'
      ],
      write: [
        'inventory', 'storage_bins', 'products', 'inventory_movements'
      ]
    },
    driver: {
      read: [
        'deliveries'
      ],
      write: [
        'deliveries'
      ]
    }
  };

  return features[userRole] || { read: [], write: [] };
};

/**
 * Feature-based permission check
 */
const requireFeature = (feature, accessType = 'read') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin always has access
    if (req.user.role === 'admin') {
      return next();
    }

    const features = getUserFeatures(req.user.role);
    const allowedFeatures = features[accessType] || [];

    if (!allowedFeatures.includes(feature)) {
      return res.status(403).json({
        error: `Access denied. Required ${accessType} access to: ${feature}`,
        allowedFeatures: features
      });
    }

    next();
  };
};

/**
 * Check if user can view (read-only access)
 * All authenticated users can view, but some roles have limited views
 */
const canView = (resource) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin can view everything
    if (req.user.role === 'admin') {
      return next();
    }

    const features = getUserFeatures(req.user.role);
    const canRead = features.read || [];

    // Check if resource is in readable list
    if (canRead.includes(resource)) {
      return next();
    }

    return res.status(403).json({
      error: `View access denied for: ${resource}`,
      allowedResources: canRead
    });
  };
};

/**
 * Check if user can modify (write access)
 */
const canModify = (resource) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin can modify everything
    if (req.user.role === 'admin') {
      return next();
    }

    const features = getUserFeatures(req.user.role);
    const canWrite = features.write || [];

    // Check if resource is in writable list
    if (canWrite.includes(resource)) {
      return next();
    }

    return res.status(403).json({
      error: `Modify access denied for: ${resource}`,
      allowedResources: canWrite
    });
  };
};

module.exports = {
  checkRoles,
  requireAdmin,
  requireRead,
  requireWrite,
  requireFinance,
  requireSales,
  requireProduction,
  requireWarehouse,
  requireDriver,
  requireCustomerManagement,
  requireInvoiceCreate,
  requireStockAdjustment,
  requirePayroll,
  requireUserManagement,
  getUserFeatures,
  requireFeature,
  canView,
  canModify
};
