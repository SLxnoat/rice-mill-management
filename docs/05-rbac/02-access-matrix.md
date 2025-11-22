# RBAC - Roles & Permissions
## Role-Based Access Control Matrix

### System Roles

The Rice Mill Management System implements 7 distinct user roles:

1. **Admin** - Full system access
2. **Accountant** - Financial management
3. **Sales Manager** - Sales and customer management
4. **Operator** - Production management
5. **Labour** - Basic production tasks
6. **Warehouse Manager** - Inventory management
7. **Driver** - Delivery management

---

## Feature Access Matrix

| Feature | Admin | Accountant | Sales Manager | Operator | Labour | Warehouse Manager | Driver |
|---------|-------|------------|---------------|----------|--------|-------------------|--------|
| **Dashboard** | ✅ Full | ✅ Financial | ✅ Sales | ✅ Production | ✅ Basic | ✅ Inventory | ✅ Delivery |
| **User Management** | ✅ CRUD | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Customer Management** | ✅ CRUD | 👁️ View | ✅ CRUD | 👁️ View | 👁️ View | 👁️ View | 👁️ View |
| **Supplier Management** | ✅ CRUD | ✅ CRUD | 👁️ View | 👁️ View | ❌ | 👁️ View | ❌ |
| **Procurement** | ✅ CRUD | ✅ CRUD | 👁️ View | 👁️ View | ❌ | 👁️ View | ❌ |
| **Production Batches** | ✅ CRUD | 👁️ View | 👁️ View | ✅ CRUD | 👁️ View | 👁️ View | 👁️ View |
| **Inventory - Raw Materials** | ✅ CRUD | 👁️ View | 👁️ View | 👁️ View | 👁️ View | ✅ CRUD | 👁️ View |
| **Inventory - Finished Goods** | ✅ CRUD | 👁️ View | 👁️ View | 👁️ View | 👁️ View | ✅ CRUD | 👁️ View |
| **Stock Adjustments** | ✅ CRUD | ❌ | ❌ | ❌ | ❌ | ✅ CRUD | ❌ |
| **Sales Orders** | ✅ CRUD | 👁️ View | ✅ CRUD | 👁️ View | 👁️ View | 👁️ View | 👁️ View |
| **Invoices** | ✅ CRUD | ✅ CRUD | ✅ CRUD | ❌ | ❌ | ❌ | ❌ |
| **Deliveries** | ✅ CRUD | 👁️ View | 👁️ View | ❌ | ❌ | 👁️ View | ✅ CRUD |
| **Expenses** | ✅ CRUD | ✅ CRUD | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Payments** | ✅ CRUD | ✅ CRUD | 👁️ View | ❌ | ❌ | ❌ | ❌ |
| **Attendance** | ✅ CRUD | ✅ CRUD | ❌ | ✅ Mark Own | ✅ Mark Own | ✅ Mark Own | ✅ Mark Own |
| **Payroll** | ✅ CRUD | ✅ CRUD | ❌ | 👁️ Own | 👁️ Own | 👁️ Own | 👁️ Own |
| **Reports - Sales** | ✅ View | ✅ View | ✅ View | ❌ | ❌ | ❌ | ❌ |
| **Reports - Production** | ✅ View | ✅ View | 👁️ View | ✅ View | ❌ | 👁️ View | ❌ |
| **Reports - Inventory** | ✅ View | ✅ View | 👁️ View | 👁️ View | ❌ | ✅ View | ❌ |
| **Reports - Financial** | ✅ View | ✅ View | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Settings** | ✅ CRUD | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Activity Logs** | ✅ View | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend:**
- ✅ = Full Access (Create, Read, Update, Delete)
- 👁️ = Read-Only Access
- ❌ = No Access

---

## Detailed Role Permissions

### 1. Admin
**Full System Access**

**Can:**
- Manage all users (create, update, delete, activate/deactivate)
- Access all modules and features
- View and modify all data
- Configure system settings
- View activity logs
- Adjust stock levels
- Override any restrictions

**Cannot:**
- Nothing (full access)

**Navigation Access:**
- Dashboard
- User Management
- Customers
- Suppliers
- Procurement
- Production
- Inventory
- Sales
- Deliveries
- Finance
- Payroll
- Reports
- Settings

---

### 2. Accountant
**Financial Management Focus**

**Can:**
- Manage suppliers and procurement
- Create and manage expenses
- Record and track payments
- Manage payroll and attendance
- Create invoices
- View sales orders
- View all financial reports
- View production and inventory data

**Cannot:**
- Manage users
- Adjust stock levels
- Create sales orders
- Manage production batches
- Manage deliveries
- Modify system settings

**Navigation Access:**
- Dashboard (Financial)
- Customers (View Only)
- Suppliers
- Procurement
- Sales (View Only)
- Finance
- Payroll
- Reports (Sales, Financial)

---

### 3. Sales Manager
**Sales & Customer Management**

**Can:**
- Manage customers (create, update)
- Create and manage sales orders
- Create invoices
- View inventory levels
- View production data
- View sales reports

**Cannot:**
- Manage users
- Manage suppliers or procurement
- Create production batches
- Adjust stock levels
- Manage expenses or payments
- Manage payroll
- Manage deliveries
- View financial reports

**Navigation Access:**
- Dashboard (Sales)
- Customers
- Sales
- Inventory (View Only)
- Production (View Only)
- Reports (Sales)

---

### 4. Operator
**Production Management**

**Can:**
- Create and manage production batches
- Complete production batches
- Mark own attendance
- View inventory levels
- View production reports

**Cannot:**
- Manage users
- Manage customers or suppliers
- Create sales orders or invoices
- Adjust stock levels
- Manage finances
- View financial reports
- Manage deliveries

**Navigation Access:**
- Dashboard (Production)
- Production
- Inventory (View Only)
- Attendance (Mark Own)
- Reports (Production)

---

### 5. Labour
**Basic Production Tasks**

**Can:**
- Mark own attendance
- View own payslips
- View basic production information

**Cannot:**
- Create or manage any records
- View other users' data
- Access financial information
- Manage inventory
- Create production batches

**Navigation Access:**
- Dashboard (Basic)
- Attendance (Mark Own)
- Payroll (View Own)

---

### 6. Warehouse Manager
**Inventory Management**

**Can:**
- Manage raw material inventory
- Manage finished goods inventory
- Create stock adjustments
- View inventory movements
- View inventory reports
- View production data

**Cannot:**
- Manage users
- Create sales orders or invoices
- Manage production batches
- Manage finances
- View financial reports

**Navigation Access:**
- Dashboard (Inventory)
- Inventory
- Production (View Only)
- Reports (Inventory)

---

### 7. Driver
**Delivery Management**

**Can:**
- View assigned deliveries
- Update delivery status
- Mark deliveries as completed
- Mark own attendance
- View own payslips

**Cannot:**
- Create sales orders
- Manage inventory
- View financial data
- Manage production

**Navigation Access:**
- Dashboard (Delivery)
- Deliveries
- Attendance (Mark Own)
- Payroll (View Own)

---

## Navigation Menu by Role

### Admin
```
Dashboard
├── User Management
├── Customers
├── Suppliers
├── Procurement & Suppliers
│   ├── Purchases
│   └── Suppliers
├── Production & Inventory
│   ├── Production Batches
│   ├── Raw Materials
│   └── Finished Goods
├── Sales & Customers
│   ├── Sales Orders
│   ├── Invoices
│   └── Customers
├── Operations
│   ├── Warehouse
│   └── Deliveries
├── Finance & Accounting
│   ├── Expenses
│   └── Payments
├── HR & Payroll
│   ├── Attendance
│   └── Payroll
├── Reports & Analytics
│   ├── Sales Reports
│   ├── Production Reports
│   ├── Inventory Reports
│   └── Financial Reports
└── Settings & Admin
    ├── System Settings
    └── Activity Logs
```

### Accountant
```
Dashboard (Financial)
├── Customers (View)
├── Suppliers
├── Procurement
├── Sales (View)
├── Finance & Accounting
│   ├── Expenses
│   └── Payments
├── HR & Payroll
│   ├── Attendance
│   └── Payroll
└── Reports
    ├── Sales Reports
    └── Financial Reports
```

### Sales Manager
```
Dashboard (Sales)
├── Customers
├── Sales & Customers
│   ├── Sales Orders
│   ├── Invoices
│   └── Customers
├── Inventory (View)
└── Reports
    └── Sales Reports
```

### Operator
```
Dashboard (Production)
├── Production
├── Inventory (View)
├── Attendance (Own)
└── Reports
    └── Production Reports
```

### Warehouse Manager
```
Dashboard (Inventory)
├── Inventory
│   ├── Raw Materials
│   ├── Finished Goods
│   └── Stock Adjustments
├── Production (View)
└── Reports
    └── Inventory Reports
```

### Driver
```
Dashboard (Delivery)
├── Deliveries
├── Attendance (Own)
└── Payroll (Own)
```

### Labour
```
Dashboard (Basic)
├── Attendance (Own)
└── Payroll (Own)
```

---

## Permission Enforcement

### Backend (API Level)
- **Authentication Middleware**: Verifies JWT token
- **Authorization Middleware**: Checks user role against required roles
- **Route Protection**: Each route specifies required roles

Example:
```javascript
router.post('/users', authenticate, requireRole('admin'), createUser);
router.get('/sales', authenticate, requireRole(['admin', 'sales_manager', 'accountant']), getSales);
```

### Frontend (UI Level)
- **Route Guards**: Protected routes check authentication and role
- **Component-Level**: Conditional rendering based on user role
- **Navigation**: Menu items filtered by role permissions

Example:
```javascript
{canManageUsers() && <MenuItem>User Management</MenuItem>}
{canViewSales() && <MenuItem>Sales</MenuItem>}
```

---

## Special Permissions

### Stock Adjustment
- **Who**: Admin, Warehouse Manager only
- **Why**: Critical operation affecting inventory valuation
- **Audit**: All adjustments logged in activity logs

### User Management
- **Who**: Admin only
- **Why**: Security-critical operation
- **Audit**: All user changes logged

### System Settings
- **Who**: Admin only
- **Why**: Affects entire system operation
- **Audit**: All setting changes logged

### Financial Reports
- **Who**: Admin, Accountant only
- **Why**: Sensitive business information
- **Audit**: Report access logged

---

## Role Assignment Rules

1. **One Role Per User**: Each user has exactly one role
2. **Role Cannot Be Changed by User**: Only admin can change user roles
3. **Default Role**: New users default to 'labour' (least privileged)
4. **Admin Protection**: At least one admin must exist in the system
5. **Role Deletion**: Cannot delete a role if users are assigned to it

---

## Security Best Practices

1. **Principle of Least Privilege**: Users have minimum permissions needed
2. **Role Segregation**: Clear separation of duties
3. **Audit Trail**: All actions logged with user, timestamp, and details
4. **Session Management**: JWT tokens with expiration
5. **Password Policy**: Strong passwords required
6. **Account Lockout**: After 5 failed login attempts (15 min lockout)
