# API Master List
## Rice Mill Management System - REST API Reference

### Base URL
```
Development: http://localhost:5000/api/v1
Production: https://your-domain.com/api/v1
```

### Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## 1. Authentication API

### POST /auth/login
**Description:** User login  
**Access:** Public  
**Request Body:**
```json
{
  "email": "admin@ricemill.com",
  "password": "admin123"
}
```
**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "email": "admin@ricemill.com",
    "role": "admin"
  }
}
```

### POST /auth/logout
**Description:** User logout  
**Access:** Protected  
**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /auth/me
**Description:** Get current user  
**Access:** Protected  
**Response:**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "email": "admin@ricemill.com",
    "role": "admin",
    "status": "active"
  }
}
```

---

## 2. User Management API

### GET /users
**Description:** Get all users  
**Access:** Admin only  
**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `role` (string): Filter by role
- `status` (string): Filter by status (active/inactive)

**Response:**
```json
{
  "success": true,
  "users": [...],
  "pagination": {
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

### POST /users
**Description:** Create new user  
**Access:** Admin only  
**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "operator",
  "phone": "1234567890"
}
```

### PUT /users/:id
**Description:** Update user  
**Access:** Admin only

### DELETE /users/:id
**Description:** Delete user  
**Access:** Admin only

---

## 3. Customer API

### GET /customers
**Description:** Get all customers  
**Access:** Admin, Sales Manager, Accountant  
**Query Parameters:**
- `page`, `limit`: Pagination
- `search`: Search by name/phone/email
- `type`: Filter by type (regular/credit)

### POST /customers
**Description:** Create customer  
**Access:** Admin, Sales Manager

### PUT /customers/:id
**Description:** Update customer  
**Access:** Admin, Sales Manager

### DELETE /customers/:id
**Description:** Delete customer  
**Access:** Admin only

### GET /customers/:id/credit-history
**Description:** Get customer credit history  
**Access:** Admin, Sales Manager, Accountant

---

## 4. Supplier API

### GET /suppliers
**Description:** Get all suppliers  
**Access:** Admin, Accountant

### POST /suppliers
**Description:** Create supplier  
**Access:** Admin, Accountant

### PUT /suppliers/:id
**Description:** Update supplier  
**Access:** Admin, Accountant

### DELETE /suppliers/:id
**Description:** Delete supplier  
**Access:** Admin only

---

## 5. Inventory API

### GET /inventory/raw-materials
**Description:** Get raw material inventory  
**Access:** All authenticated users

### GET /inventory/finished-goods
**Description:** Get finished goods inventory  
**Access:** All authenticated users

### POST /inventory/adjustments
**Description:** Create stock adjustment  
**Access:** Admin, Warehouse Manager  
**Request Body:**
```json
{
  "itemType": "raw_material",
  "itemId": "507f1f77bcf86cd799439011",
  "adjustmentType": "add",
  "quantity": 100,
  "reason": "Physical count correction",
  "notes": "Annual inventory audit"
}
```

### GET /inventory/movements
**Description:** Get inventory movement history  
**Access:** All authenticated users  
**Query Parameters:**
- `startDate`, `endDate`: Date range
- `itemType`: raw_material/finished_good
- `movementType`: in/out/adjustment

---

## 6. Production API

### GET /production/batches
**Description:** Get production batches  
**Access:** All authenticated users  
**Query Parameters:**
- `status`: in_progress/completed/cancelled
- `startDate`, `endDate`: Date range

### POST /production/batches
**Description:** Create production batch  
**Access:** Admin, Operator  
**Request Body:**
```json
{
  "batchNumber": "BATCH-2025-001",
  "paddyType": "Basmati",
  "inputQuantity": 1000,
  "startDate": "2025-11-22",
  "operator": "507f1f77bcf86cd799439011"
}
```

### PUT /production/batches/:id/complete
**Description:** Complete production batch  
**Access:** Admin, Operator  
**Request Body:**
```json
{
  "outputs": [
    {
      "productType": "Rice",
      "productName": "Basmati Rice",
      "quantity": 650,
      "quality": "A"
    },
    {
      "productType": "Husk",
      "quantity": 200
    },
    {
      "productType": "Bran",
      "quantity": 100
    },
    {
      "productType": "Broken Rice",
      "quantity": 50
    }
  ],
  "completionDate": "2025-11-23",
  "notes": "Good quality batch"
}
```

### PUT /production/batches/:id/cancel
**Description:** Cancel production batch  
**Access:** Admin only

### GET /production/summary
**Description:** Get production summary/statistics  
**Access:** All authenticated users

---

## 7. Sales API

### GET /sales/orders
**Description:** Get sales orders  
**Access:** Admin, Sales Manager, Accountant  
**Query Parameters:**
- `status`: pending/completed/cancelled
- `customerId`: Filter by customer
- `startDate`, `endDate`: Date range

### POST /sales/orders
**Description:** Create sales order  
**Access:** Admin, Sales Manager  
**Request Body:**
```json
{
  "customer": "507f1f77bcf86cd799439011",
  "orderDate": "2025-11-22",
  "items": [
    {
      "product": "507f1f77bcf86cd799439012",
      "quantity": 100,
      "unitPrice": 50,
      "total": 5000
    }
  ],
  "subtotal": 5000,
  "tax": 250,
  "total": 5250,
  "paymentMethod": "cash"
}
```

### GET /sales/invoices
**Description:** Get invoices  
**Access:** Admin, Sales Manager, Accountant

### POST /sales/invoices
**Description:** Create invoice  
**Access:** Admin, Sales Manager, Accountant

### GET /sales/invoices/:id/pdf
**Description:** Download invoice PDF  
**Access:** Admin, Sales Manager, Accountant

---

## 8. Procurement API

### GET /procurement/purchases
**Description:** Get purchase orders  
**Access:** Admin, Accountant

### POST /procurement/purchases
**Description:** Create purchase order  
**Access:** Admin, Accountant  
**Request Body:**
```json
{
  "supplier": "507f1f77bcf86cd799439011",
  "purchaseDate": "2025-11-22",
  "items": [
    {
      "itemType": "Paddy",
      "itemName": "Basmati Paddy",
      "quantity": 1000,
      "unitPrice": 30,
      "total": 30000
    }
  ],
  "subtotal": 30000,
  "tax": 1500,
  "total": 31500,
  "paymentMethod": "bank_transfer"
}
```

---

## 9. Finance API

### GET /finance/expenses
**Description:** Get expenses  
**Access:** Admin, Accountant  
**Query Parameters:**
- `category`: Filter by category
- `startDate`, `endDate`: Date range

### POST /finance/expenses
**Description:** Create expense  
**Access:** Admin, Accountant  
**Request Body:**
```json
{
  "category": "Utilities",
  "amount": 5000,
  "date": "2025-11-22",
  "description": "Electricity bill",
  "paymentMethod": "cash"
}
```

### GET /finance/payments
**Description:** Get payments  
**Access:** Admin, Accountant

### POST /finance/payments
**Description:** Record payment  
**Access:** Admin, Accountant

### GET /finance/summary
**Description:** Get financial summary  
**Access:** Admin, Accountant  
**Response:**
```json
{
  "success": true,
  "summary": {
    "totalRevenue": 150000,
    "totalExpenses": 80000,
    "grossProfit": 70000,
    "netProfit": 65000,
    "cashBalance": 100000
  }
}
```

---

## 10. Payroll API

### GET /payroll/attendance
**Description:** Get attendance records  
**Access:** Admin, Accountant

### POST /payroll/attendance
**Description:** Mark attendance  
**Access:** All authenticated users  
**Request Body:**
```json
{
  "employee": "507f1f77bcf86cd799439011",
  "date": "2025-11-22",
  "status": "present",
  "checkIn": "09:00",
  "checkOut": "18:00",
  "overtimeHours": 2
}
```

### GET /payroll/payslips
**Description:** Get payslips  
**Access:** Admin, Accountant

### POST /payroll/payslips
**Description:** Generate payslip  
**Access:** Admin, Accountant

---

## 11. Reports API

### GET /reports/sales
**Description:** Get sales report  
**Access:** Admin, Sales Manager, Accountant  
**Query Parameters:**
- `startDate`, `endDate`: Date range
- `groupBy`: day/month/year
- `customerId`: Filter by customer

### GET /reports/production
**Description:** Get production report  
**Access:** Admin, Operator, Accountant

### GET /reports/inventory
**Description:** Get inventory report  
**Access:** Admin, Warehouse Manager, Accountant

### GET /reports/financial
**Description:** Get financial report  
**Access:** Admin, Accountant

---

## 12. Settings API

### GET /settings
**Description:** Get system settings  
**Access:** All authenticated users

### PUT /settings
**Description:** Update system settings  
**Access:** Admin only  
**Request Body:**
```json
{
  "millName": "ABC Rice Mill",
  "address": "123 Main St",
  "phone": "1234567890",
  "email": "info@abcricemill.com",
  "currency": "INR",
  "taxRate": 5,
  "autoNumbering": {
    "salesOrderPrefix": "SO",
    "invoicePrefix": "INV",
    "batchPrefix": "BATCH"
  }
}
```

---

## 13. Activity Log API

### GET /activity-logs
**Description:** Get activity logs  
**Access:** Admin only  
**Query Parameters:**
- `userId`: Filter by user
- `module`: Filter by module
- `action`: Filter by action
- `startDate`, `endDate`: Date range

---

## Response Format Guidelines

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message"
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 10,
    "limit": 10
  }
}
```

---

## HTTP Status Codes

- `200 OK`: Successful GET, PUT, DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Rate Limiting

- **Global**: 100 requests per 15 minutes
- **Authentication**: 5 login attempts per 15 minutes

---

## Error Codes

- `AUTH_001`: Invalid credentials
- `AUTH_002`: Token expired
- `AUTH_003`: Invalid token
- `PERM_001`: Insufficient permissions
- `VAL_001`: Validation error
- `DB_001`: Database error
- `NOT_FOUND`: Resource not found
