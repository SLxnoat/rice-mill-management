# System Architecture
## Rice Mill Management System

### Architecture Overview

The Rice Mill Management System follows a modern **3-tier architecture** pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│                    (React Frontend - SPA)                    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Inventory │  │Production│  │  Sales   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Finance  │  │ Payroll  │  │ Reports  │  │ Settings │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS (REST API)
                            │ JSON
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                       │
│                 (Node.js + Express Backend)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Gateway & Middleware                 │  │
│  │  • CORS  • Helmet  • Rate Limiting  • Body Parser   │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Authentication & Authorization           │  │
│  │  • JWT Verification  • Role-Based Access Control     │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Business Logic Layer                 │  │
│  │                                                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │Controllers│  │ Services │  │  Utils   │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Mongoose ODM
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        DATA LAYER                            │
│                    (MongoDB Database)                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Users   │  │Customers │  │Suppliers │  │ Products │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Inventory │  │Production│  │  Sales   │  │ Finance  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  Primary: MongoDB Atlas  │  Backup: Local MongoDB           │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### 1. Frontend Architecture (React)

```
client/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── common/        # Shared components (Table, Dialog, etc.)
│   │   ├── layout/        # Layout components (Header, Sidebar, Footer)
│   │   ├── auth/          # Authentication components
│   │   ├── inventory/     # Inventory-specific components
│   │   ├── production/    # Production-specific components
│   │   ├── sales/         # Sales-specific components
│   │   └── ...
│   │
│   ├── pages/             # Page components (routes)
│   │   ├── Dashboard.js
│   │   ├── Inventory.js
│   │   ├── Production.js
│   │   ├── Sales.js
│   │   └── ...
│   │
│   ├── contexts/          # React Context for state management
│   │   ├── AuthContext.js
│   │   └── ToastContext.js
│   │
│   ├── services/          # API service layer
│   │   └── apiClient.js   # Axios instance with interceptors
│   │
│   ├── utils/             # Utility functions
│   │   ├── logger.js      # Production-safe logging
│   │   ├── formatters.js  # Data formatting utilities
│   │   └── validators.js  # Form validation
│   │
│   ├── theme/             # MUI theme configuration
│   │   └── theme.js
│   │
│   ├── App.js             # Main app component with routing
│   └── index.js           # Entry point
```

**Key Frontend Patterns:**
- **Code Splitting**: React.lazy() for all page components
- **Component Memoization**: React.memo() for performance
- **Context API**: Global state management (Auth, Toast)
- **Custom Hooks**: Reusable logic (useAuth, useToast)
- **Protected Routes**: Route guards based on authentication and roles

#### 2. Backend Architecture (Node.js + Express)

```
server/
├── config/                # Configuration files
│   ├── database.js       # MongoDB connection with failover
│   └── constants.js      # Application constants
│
├── models/               # Mongoose schemas (24 models)
│   ├── User.js
│   ├── Customer.js
│   ├── Supplier.js
│   ├── Product.js
│   ├── Inventory.js
│   ├── ProductionBatch.js
│   ├── SalesOrder.js
│   ├── Invoice.js
│   └── ...
│
├── controllers/          # Request handlers (21 controllers)
│   ├── auth.js
│   ├── users.js
│   ├── customers.js
│   ├── inventory.js
│   ├── production.js
│   ├── sales.js
│   └── ...
│
├── routes/               # API route definitions (21 route files)
│   ├── auth.js
│   ├── users.js
│   ├── customers.js
│   ├── inventory.js
│   └── ...
│
├── middlewares/          # Custom middleware
│   ├── auth.js          # JWT authentication
│   └── role.js          # Role-based authorization
│
├── middleware/           # Additional middleware
│   └── activityLogger.js # Activity logging
│
├── utils/                # Utility functions
│   ├── logger.js
│   ├── validators.js
│   └── helpers.js
│
├── scripts/              # Utility scripts
│   ├── syncDatabase.js
│   └── triggerNotifications.js
│
├── seed.js               # Database seeding
├── seed-users.js         # User seeding
└── server.js             # Main server file
```

**Key Backend Patterns:**
- **MVC Pattern**: Models, Controllers, Routes separation
- **Middleware Chain**: Authentication → Authorization → Business Logic
- **Error Handling**: Centralized error handling with express-async-errors
- **Validation**: Input validation with express-validator
- **Logging**: Activity logging for audit trails

#### 3. Database Architecture (MongoDB)

**Collections (24 total):**

**Core Collections:**
- `users` - User accounts and authentication
- `customers` - Customer information
- `suppliers` - Supplier information
- `products` - Product catalog

**Inventory Collections:**
- `rawmaterials` - Raw material inventory (paddy)
- `finishedgoods` - Finished product inventory (rice)
- `inventorymovements` - Stock movement history
- `stockadjustments` - Manual stock adjustments

**Production Collections:**
- `productionbatches` - Production batch records
- `productionoutputs` - Batch output details

**Sales Collections:**
- `salesorders` - Sales order records
- `invoices` - Invoice records
- `deliveries` - Delivery records

**Finance Collections:**
- `expenses` - Expense records
- `payments` - Payment records
- `creditcustomers` - Customer credit tracking

**HR Collections:**
- `attendance` - Attendance records
- `payroll` - Payroll records
- `employees` - Employee information

**System Collections:**
- `activitylogs` - System activity audit trail
- `notifications` - User notifications
- `settings` - System settings
- `autonumbers` - Auto-numbering sequences

### Data Flow Architecture

#### 1. Authentication Flow

```
User Login Request
    │
    ▼
Frontend (Login.js)
    │
    │ POST /api/v1/auth/login
    │ { email, password, rememberMe }
    ▼
Backend (auth.js controller)
    │
    ├─► Validate input
    ├─► Find user in database
    ├─► Verify password (bcrypt)
    ├─► Generate JWT token
    └─► Return { token, user }
    │
    ▼
Frontend (AuthContext)
    │
    ├─► Store token (localStorage or sessionStorage)
    ├─► Set user state
    └─► Redirect to dashboard
```

#### 2. Protected API Request Flow

```
User Action (e.g., Create Sales Order)
    │
    ▼
Frontend Component
    │
    │ API Request with JWT token
    │ Authorization: Bearer <token>
    ▼
API Client (Axios Interceptor)
    │
    ├─► Add Authorization header
    └─► Send request
    │
    ▼
Backend Middleware Chain
    │
    ├─► CORS validation
    ├─► Rate limiting check
    ├─► Helmet security headers
    ├─► Body parsing
    ├─► JWT authentication (middlewares/auth.js)
    │   ├─► Verify token
    │   ├─► Check user exists and active
    │   └─► Attach user to req.user
    │
    ├─► Role authorization (middlewares/role.js)
    │   └─► Check user has required role
    │
    ├─► Input validation (express-validator)
    │
    ▼
Controller (Business Logic)
    │
    ├─► Process request
    ├─► Interact with database
    ├─► Log activity
    └─► Return response
    │
    ▼
Frontend
    │
    ├─► Update UI
    ├─► Show toast notification
    └─► Refresh data
```

#### 3. Production Batch Flow

```
Create Production Batch
    │
    ▼
Frontend (Production.js)
    │
    │ POST /api/v1/production/batches
    │ { paddyType, quantity, ... }
    ▼
Backend (production.js controller)
    │
    ├─► Validate input
    ├─► Check raw material availability
    ├─► Create batch record (status: 'in_progress')
    ├─► Deduct raw material from inventory
    ├─► Log activity
    └─► Return batch details
    │
    ▼
Production Process (Manual)
    │
    ▼
Complete Production Batch
    │
    ▼
Frontend (Production.js)
    │
    │ PUT /api/v1/production/batches/:id/complete
    │ { outputs: [...], quality, ... }
    ▼
Backend (production.js controller)
    │
    ├─► Validate batch exists and in_progress
    ├─► Calculate yield percentages
    ├─► Update batch status to 'completed'
    ├─► Add finished goods to inventory
    ├─► Add by-products to inventory
    ├─► Calculate batch cost (FIFO)
    ├─► Log activity
    └─► Return updated batch
    │
    ▼
Frontend
    │
    ├─► Update batch list
    ├─► Show success notification
    └─► Refresh inventory
```

### Security Architecture

**Authentication:**
- JWT (JSON Web Tokens) with configurable expiration
- Secure password hashing with bcryptjs (10 rounds)
- Token stored in localStorage (Remember Me) or sessionStorage

**Authorization:**
- Role-Based Access Control (RBAC)
- 7 predefined roles with granular permissions
- Middleware-based route protection
- Frontend route guards

**Security Measures:**
- Rate limiting (100 requests/15min global, 5 login attempts/15min)
- Helmet security headers
- CORS with restricted origins
- Input validation and sanitization
- XSS protection with DOMPurify
- SQL injection protection (Mongoose parameterized queries)
- Error messages don't leak sensitive information

**Activity Logging:**
- All user actions logged to `activitylogs` collection
- Includes: user, action, module, timestamp, IP address, changes
- Audit trail for compliance and debugging

### Deployment Architecture

#### Development Environment

```
Developer Machine
    │
    ├─► Frontend Dev Server (localhost:3000)
    │   └─► React Dev Server with Hot Reload
    │
    └─► Backend Dev Server (localhost:5000)
        └─► Nodemon with Auto-restart
        │
        ▼
    Local MongoDB (localhost:27017)
```

#### Production Environment (Option 1: Traditional VPS)

```
Internet
    │
    ▼
Nginx (Reverse Proxy + SSL)
    │
    ├─► Frontend (Static Files)
    │   └─► React Build (Optimized)
    │
    └─► Backend API (Proxy to localhost:5000)
        │
        ▼
    PM2 Process Manager
        │
        └─► Node.js Server (Multiple Instances)
            │
            ▼
    MongoDB Atlas (Primary)
        │
        └─► Local MongoDB (Backup/Failover)
```

#### Production Environment (Option 2: Docker)

```
Docker Compose
    │
    ├─► Frontend Container (Nginx)
    │   └─► Serves React Build
    │
    ├─► Backend Container (Node.js)
    │   └─► Express Server
    │
    └─► MongoDB Container (Optional)
        └─► Local MongoDB Instance
        │
        ▼
    MongoDB Atlas (Primary Cloud Database)
```

### Scalability Considerations

**Horizontal Scaling:**
- Stateless backend (JWT tokens, no server sessions)
- Load balancer can distribute requests across multiple backend instances
- MongoDB Atlas supports automatic scaling

**Vertical Scaling:**
- Increase server resources (CPU, RAM) as needed
- MongoDB connection pooling (maxPoolSize: 10)

**Caching Strategy (Future):**
- Redis for session management
- API response caching for frequently accessed data
- Client-side caching with React Query

**Database Optimization:**
- Indexes on frequently queried fields
- Compound indexes for complex queries
- Aggregation pipelines for reports

### Performance Optimization

**Frontend:**
- Code splitting with React.lazy()
- Component memoization (React.memo, useMemo, useCallback)
- Lazy loading of images and heavy components
- Production build minification and tree-shaking

**Backend:**
- Database query optimization with indexes
- Lean queries (select only needed fields)
- Pagination for large datasets
- Connection pooling

**Network:**
- Gzip compression
- CDN for static assets (future)
- HTTP/2 support

### Monitoring & Logging

**Application Monitoring:**
- PM2 monitoring dashboard
- Custom activity logs in database
- Error tracking (Sentry integration ready)

**Database Monitoring:**
- MongoDB Atlas monitoring dashboard
- Query performance metrics
- Storage usage tracking

**Server Monitoring:**
- CPU and memory usage
- Disk space monitoring
- Network traffic analysis

### Backup & Recovery

**Database Backup:**
- MongoDB Atlas automated backups (configurable)
- Manual backup scripts available
- Point-in-time recovery

**Application Backup:**
- Git version control
- Environment configuration backups
- Deployment rollback procedures

### Technology Versions

**Frontend:**
- React: 18.3.1
- Material-UI: 7.3.5
- React Router: 7.9.6
- Axios: 1.13.2

**Backend:**
- Node.js: 18+
- Express: 4.21.2
- Mongoose: 8.20.0
- JWT: 9.0.2

**Database:**
- MongoDB: 6.0+ (Atlas) / 7.0+ (Local)

**Security:**
- bcryptjs: 3.0.3
- helmet: 8.1.0
- express-rate-limit: 8.2.1
- express-validator: 7.3.1

### Conclusion

The Rice Mill Management System architecture is designed for:
- **Scalability**: Can grow with business needs
- **Security**: Multiple layers of protection
- **Performance**: Optimized for fast response times
- **Maintainability**: Clean separation of concerns
- **Reliability**: Failover mechanisms and backup strategies
