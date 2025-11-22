# Production Deployment Guide
## Rice Mill Management System

### Prerequisites

**Server Requirements:**
- Ubuntu 20.04+ / Windows Server 2019+ / CentOS 8+
- Node.js 18.x or higher
- MongoDB 6.0+ (or MongoDB Atlas account)
- Nginx (for reverse proxy)
- SSL Certificate (Let's Encrypt recommended)
- Minimum 2GB RAM, 2 CPU cores, 20GB storage

**Development Tools:**
- Git
- PM2 (for process management)
- Certbot (for SSL certificates)

---

## Deployment Steps

### 1. Server Setup

#### Install Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### Install MongoDB (if using local)
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Install Nginx
```bash
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Install PM2
```bash
sudo npm install -g pm2
```

---

### 2. Clone and Setup Application

```bash
# Clone repository
cd /var/www
sudo git clone <your-repo-url> rice-mill-management
cd rice-mill-management

# Set permissions
sudo chown -R $USER:$USER /var/www/rice-mill-management
```

---

### 3. Backend Setup

```bash
cd server

# Install dependencies
npm install --production

# Create production environment file
cp .env.production.example .env

# Edit .env with production values
nano .env
```

**Production .env:**
```env
PORT=5000
NODE_ENV=production

# Database
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/rice_mill
MONGO_URI_BACKUP=mongodb://localhost:27017/rice_mill

# Security
JWT_SECRET=<generate-secure-secret-64-chars>

# Frontend URL
FRONTEND_URL=https://your-domain.com
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Seed Database (First Time Only):**
```bash
npm run seed
```

---

### 4. Frontend Setup

```bash
cd ../client

# Install dependencies
npm install

# Create production environment file
cp .env.production.example .env

# Edit .env
nano .env
```

**Production .env:**
```env
REACT_APP_API_URL=https://api.your-domain.com/api/v1
NODE_ENV=production
```

**Build Frontend:**
```bash
npm run build
```

This creates an optimized production build in `client/build/`.

---

### 5. Configure PM2 for Backend

**Create PM2 Ecosystem File:**
```bash
cd /var/www/rice-mill-management
nano ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'rice-mill-api',
    script: './server/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

**Start Application:**
```bash
# Create logs directory
mkdir logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs
```

**PM2 Commands:**
```bash
pm2 status                 # Check status
pm2 logs rice-mill-api     # View logs
pm2 restart rice-mill-api  # Restart app
pm2 stop rice-mill-api     # Stop app
pm2 monit                  # Monitor resources
```

---

### 6. Configure Nginx

#### Backend API Configuration

**Create Nginx config:**
```bash
sudo nano /etc/nginx/sites-available/rice-mill-api
```

**rice-mill-api:**
```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Frontend Configuration

**Create Nginx config:**
```bash
sudo nano /etc/nginx/sites-available/rice-mill-frontend
```

**rice-mill-frontend:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/rice-mill-management/client/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable Sites:**
```bash
sudo ln -s /etc/nginx/sites-available/rice-mill-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/rice-mill-frontend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### 7. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificates
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot --nginx -d api.your-domain.com

# Certbot will automatically update Nginx config for HTTPS
```

**Auto-renewal:**
```bash
# Test renewal
sudo certbot renew --dry-run

# Renewal is automatic via cron
```

---

### 8. Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

### 9. MongoDB Atlas Setup (Recommended)

1. **Create Account**: Sign up at mongodb.com/cloud/atlas
2. **Create Cluster**: Choose free tier or paid plan
3. **Create Database User**: With username and password
4. **Whitelist IP**: Add your server's IP address (or 0.0.0.0/0 for all)
5. **Get Connection String**: Copy the connection string
6. **Update .env**: Replace MONGO_URI with Atlas connection string

---

### 10. Post-Deployment Verification

**Check Backend:**
```bash
curl https://api.your-domain.com/api/v1/health
# Should return: {"status":"ok"}
```

**Check Frontend:**
```bash
curl https://your-domain.com
# Should return HTML
```

**Check PM2:**
```bash
pm2 status
# Should show 'online' status
```

**Check Nginx:**
```bash
sudo systemctl status nginx
# Should show 'active (running)'
```

**Check Logs:**
```bash
pm2 logs rice-mill-api --lines 50
```

---

### 11. Database Backup Strategy

**Automated Backup Script:**
```bash
sudo nano /usr/local/bin/backup-mongodb.sh
```

**backup-mongodb.sh:**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR/backup_$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" "$BACKUP_DIR/backup_$DATE"
rm -rf "$BACKUP_DIR/backup_$DATE"

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

**Make Executable:**
```bash
sudo chmod +x /usr/local/bin/backup-mongodb.sh
```

**Schedule with Cron (Daily at 2 AM):**
```bash
sudo crontab -e
# Add line:
0 2 * * * /usr/local/bin/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

---

### 12. Monitoring Setup

**PM2 Monitoring:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**System Monitoring:**
```bash
# Install htop
sudo apt-get install -y htop

# Monitor resources
htop
```

---

### 13. Update Procedure

**Backend Update:**
```bash
cd /var/www/rice-mill-management
git pull origin main
cd server
npm install --production
pm2 restart rice-mill-api
```

**Frontend Update:**
```bash
cd /var/www/rice-mill-management
git pull origin main
cd client
npm install
npm run build
```

**Database Migration (if needed):**
```bash
cd server
npm run migrate  # If migration script exists
```

---

### 14. Rollback Procedure

**If Update Fails:**
```bash
# Stop application
pm2 stop rice-mill-api

# Rollback code
git reset --hard HEAD~1

# Reinstall dependencies
cd server
npm install --production

# Restart
pm2 restart rice-mill-api
```

---

### 15. Troubleshooting

**Backend Not Starting:**
```bash
# Check logs
pm2 logs rice-mill-api

# Check environment variables
pm2 env 0

# Check MongoDB connection
mongo --eval "db.adminCommand('ping')"
```

**Frontend Shows Blank Page:**
- Check browser console for errors
- Verify REACT_APP_API_URL in .env
- Check CORS configuration in backend
- Clear browser cache

**Database Connection Failed:**
- Verify MongoDB is running: `sudo systemctl status mongod`
- Check connection string in .env
- For Atlas: Verify IP whitelist
- Check network connectivity

**SSL Certificate Issues:**
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew
```

---

### 16. Security Checklist

- [ ] Strong JWT_SECRET generated
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Firewall configured (only 22, 80, 443 open)
- [ ] MongoDB authentication enabled
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Regular backups scheduled
- [ ] PM2 auto-restart enabled
- [ ] Nginx security headers configured
- [ ] Rate limiting active
- [ ] Error messages don't leak sensitive info
- [ ] Default admin password changed
- [ ] Activity logging enabled

---

### 17. Performance Optimization

**Nginx Caching:**
```nginx
# Add to server block
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

location /api/v1/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
    # ... other proxy settings
}
```

**PM2 Cluster Mode:**
- Already configured in ecosystem.config.js
- Runs 2 instances for load balancing

**MongoDB Indexing:**
- Indexes already defined in models
- Monitor slow queries in Atlas

---

### 18. Maintenance Schedule

**Daily:**
- Monitor error logs
- Check application status

**Weekly:**
- Review activity logs
- Check disk space
- Review performance metrics

**Monthly:**
- Update dependencies (security patches)
- Review and optimize database
- Verify backup integrity
- Review access logs

**Quarterly:**
- Full security audit
- Performance optimization review
- Capacity planning

---

## Quick Reference Commands

```bash
# Application Management
pm2 status                      # Check app status
pm2 restart rice-mill-api       # Restart app
pm2 logs rice-mill-api          # View logs
pm2 monit                       # Monitor resources

# Nginx Management
sudo systemctl status nginx     # Check Nginx status
sudo nginx -t                   # Test config
sudo systemctl reload nginx     # Reload config

# Database
mongodump --uri="$MONGO_URI"    # Backup database
mongorestore --uri="$MONGO_URI" # Restore database

# SSL Certificates
sudo certbot renew              # Renew certificates
sudo certbot certificates       # Check status

# System
htop                            # Monitor resources
df -h                           # Check disk space
free -h                         # Check memory
```

---

## Support

For issues or questions:
- Check logs: `pm2 logs rice-mill-api`
- Review documentation in `/docs`
- Contact system administrator

**Deployment Complete! 🎉**
