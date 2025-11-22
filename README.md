# Rice Mill Management System

A comprehensive ERP system designed specifically for rice mill operations, built with modern web technologies.

## 🌾 Overview

The Rice Mill Management System is a full-featured enterprise resource planning (ERP) solution tailored for rice mill operations. It manages the complete workflow from paddy procurement to finished rice sales, including production, inventory, finance, and operations management.

## ✨ Key Features

- **Procurement & Suppliers**: Manage paddy purchases, supplier relationships, and quality tracking
- **Production & Inventory**: Track production batches, inventory levels, and warehouse management
- **Sales & Customers**: Handle sales orders, customer management, and distribution
- **Finance & Accounting**: Complete accounting system with ledgers, payments, and financial reports
- **Operations**: Manage payroll, maintenance, and daily operations
- **Reports & Analytics**: Comprehensive reporting and business intelligence
- **Role-Based Access Control (RBAC)**: Secure access with multiple user roles
- **Real-time Dashboard**: Live metrics and activity tracking

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **API Documentation**: OpenAPI/Swagger

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: CSS3 (Custom Design System)
- **State Management**: React Context API
- **Routing**: React Router v6

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn package manager

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/SLxnoat/rice-mill-management.git
cd rice-mill-management
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Update .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=rice_mill_db
# DB_USER=your_username
# DB_PASSWORD=your_password
# JWT_SECRET=your_jwt_secret

# Run database migrations
npm run migrate

# Seed initial data
npm run seed

# Start development server
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create .env file
cp .env.example .env

# Update .env with backend URL
# VITE_API_URL=http://localhost:5000

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`

### 4. Default Login Credentials

- **Email**: admin@ricemill.com
- **Password**: admin123

## 📁 Project Structure

```
rice-mill-management/
├── backend/                 # Node.js/Express backend
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
├── frontend/               # React frontend
│   ├── public/             # Static assets
│   └── src/
│       ├── components/     # Reusable components
│       ├── pages/          # Page components
│       ├── services/       # API services
│       ├── context/        # React Context
│       └── styles/         # CSS files
├── docs/                   # Documentation
└── docker/                 # Docker configuration
```

## 📚 Documentation

Comprehensive documentation is available in the `/docs` folder:

- [System Overview](./docs/01-system-overview/01-project-introduction.md)
- [Technical Architecture](./docs/03-technical-architecture/01-system-architecture.md)
- [API Documentation](./docs/07-api/01-api-master-list.md)
- [Deployment Guide](./docs/13-deployment/02-production-deployment.md)

## 🔐 User Roles

- **Admin**: Full system access
- **Manager**: Operations and reporting access
- **Accountant**: Financial module access
- **Operator**: Production and inventory access
- **Sales**: Sales and customer management access

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Stop containers
docker-compose down
```

## 📊 Database Schema

The system uses PostgreSQL with the following main entities:
- Users & Roles
- Suppliers & Customers
- Inventory Items
- Production Batches
- Sales Orders
- Purchase Orders
- Accounts & Ledgers
- Payments & Receipts

See [Database ERD](./docs/03-technical-architecture/02-database-schema.md) for detailed schema.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Mayura Bandara

## 🙏 Acknowledgments

- Built for modern rice mill operations
- Designed with scalability and maintainability in mind
- Community feedback and contributions

## 📞 Support

For support, email support@ricemill.com or open an issue in the GitHub repository.

---

**Made with ❤️ for the Rice Mill Industry**
