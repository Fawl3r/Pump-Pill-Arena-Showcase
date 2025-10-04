# 🚀 Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying Pump Pill Arena to production environments. The deployment process includes environment setup, database configuration, smart contract deployment, and application deployment.

## Prerequisites

### System Requirements
- **Node.js**: 18+ (LTS recommended)
- **pnpm**: 8+ package manager
- **PostgreSQL**: 14+ database
- **Redis**: 6+ for caching
- **Docker**: 20+ for containerization
- **Kubernetes**: 1.25+ for orchestration

### Cloud Provider Setup
- **AWS/GCP/Azure**: Cloud infrastructure
- **Domain**: Custom domain with SSL certificate
- **CDN**: CloudFlare or similar for static assets
- **Monitoring**: Prometheus, Grafana, or similar

## Environment Configuration

### Environment Variables

Create environment files for different environments:

#### Development (.env.development)
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pump_pill_arena_dev"
REDIS_URL="redis://localhost:6379"

# Solana
SOLANA_RPC_URL="https://api.devnet.solana.com"
NEXT_PUBLIC_SOLANA_RPC="https://api.devnet.solana.com"
NEXT_PUBLIC_CHAIN_EXPLORER_BASE="https://solscan.io"

# Smart Contracts
NEXT_PUBLIC_REWARD_VAULT_PROGRAM_ID="your-devnet-program-id"
NEXT_PUBLIC_MERKLE_DISTRIBUTOR_PROGRAM_ID="your-devnet-program-id"
NEXT_PUBLIC_PLATFORM_ROUTER_PROGRAM_ID="your-devnet-program-id"

# Security
JWT_SECRET="your-jwt-secret"
ADMIN_API_TOKEN="your-admin-token"

# Features
NEXT_PUBLIC_ENABLE_CLAIMS="true"
NEXT_PUBLIC_ENABLE_PROFILE="true"
NEXT_PUBLIC_ENABLE_LEADERBOARD="true"
```

#### Production (.env.production)
```bash
# Database
DATABASE_URL="postgresql://user:password@prod-db:5432/pump_pill_arena"
REDIS_URL="redis://prod-redis:6379"

# Solana
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
NEXT_PUBLIC_SOLANA_RPC="https://api.mainnet-beta.solana.com"
NEXT_PUBLIC_CHAIN_EXPLORER_BASE="https://solscan.io"

# Smart Contracts
NEXT_PUBLIC_REWARD_VAULT_PROGRAM_ID="your-mainnet-program-id"
NEXT_PUBLIC_MERKLE_DISTRIBUTOR_PROGRAM_ID="your-mainnet-program-id"
NEXT_PUBLIC_PLATFORM_ROUTER_PROGRAM_ID="your-mainnet-program-id"

# Security
JWT_SECRET="your-production-jwt-secret"
ADMIN_API_TOKEN="your-production-admin-token"

# Features
NEXT_PUBLIC_ENABLE_CLAIMS="true"
NEXT_PUBLIC_ENABLE_PROFILE="true"
NEXT_PUBLIC_ENABLE_LEADERBOARD="true"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
PROMETHEUS_ENDPOINT="http://prometheus:9090"
```

## Database Setup

### PostgreSQL Configuration

#### 1. Create Database
```sql
-- Create database
CREATE DATABASE pump_pill_arena;

-- Create user
CREATE USER pump_pill_user WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE pump_pill_arena TO pump_pill_user;
```

#### 2. Run Migrations
```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Seed initial data (optional)
pnpm db:seed
```

#### 3. Database Optimization
```sql
-- Create indexes for performance
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_timestamp ON trades(timestamp);
CREATE INDEX idx_rewards_user_id ON rewards(user_id);
CREATE INDEX idx_rewards_epoch_id ON rewards(epoch_id);

-- Configure connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

## Smart Contract Deployment

### 1. Build Contracts
```bash
# Navigate to contracts directory
cd contracts

# Build all contracts
anchor build

# Verify build
anchor test
```

### 2. Deploy to Devnet
```bash
# Set Solana cluster to devnet
solana config set --url devnet

# Deploy contracts
anchor deploy

# Save program IDs
echo "REWARD_VAULT_PROGRAM_ID=$(solana address -k target/deploy/reward_vault-keypair.json)" >> .env
echo "MERKLE_DISTRIBUTOR_PROGRAM_ID=$(solana address -k target/deploy/merkle_distributor-keypair.json)" >> .env
echo "PLATFORM_ROUTER_PROGRAM_ID=$(solana address -k target/deploy/platform_router-keypair.json)" >> .env
```

### 3. Deploy to Mainnet
```bash
# Set Solana cluster to mainnet
solana config set --url mainnet-beta

# Deploy contracts (ensure sufficient SOL balance)
anchor deploy

# Verify deployment
solana program show <PROGRAM_ID>
```

### 4. Initialize Contracts
```bash
# Initialize reward vault
anchor run initialize-vault

# Initialize merkle distributor
anchor run initialize-distributor

# Initialize platform router
anchor run initialize-router
```

## Application Deployment

### Docker Deployment

#### 1. Build Docker Images
```bash
# Build frontend image
docker build -t pump-pill-arena-frontend -f Dockerfile.frontend .

# Build backend image
docker build -t pump-pill-arena-backend -f Dockerfile.backend .
```

#### 2. Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    image: pump-pill-arena-frontend:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.pumppillarena.com
    depends_on:
      - backend

  backend:
    image: pump-pill-arena-backend:latest
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=pump_pill_arena
      - POSTGRES_USER=pump_pill_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### 3. Deploy with Docker Compose
```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Kubernetes Deployment

#### 1. Namespace
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: pump-pill-arena
```

#### 2. ConfigMap
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pump-pill-arena-config
  namespace: pump-pill-arena
data:
  NODE_ENV: "production"
  NEXT_PUBLIC_API_URL: "https://api.pumppillarena.com"
```

#### 3. Secret
```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: pump-pill-arena-secrets
  namespace: pump-pill-arena
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  ADMIN_API_TOKEN: <base64-encoded-admin-token>
```

#### 4. Frontend Deployment
```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pump-pill-arena-frontend
  namespace: pump-pill-arena
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pump-pill-arena-frontend
  template:
    metadata:
      labels:
        app: pump-pill-arena-frontend
    spec:
      containers:
      - name: frontend
        image: pump-pill-arena-frontend:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: pump-pill-arena-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: pump-pill-arena-frontend-service
  namespace: pump-pill-arena
spec:
  selector:
    app: pump-pill-arena-frontend
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### 5. Backend Deployment
```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pump-pill-arena-backend
  namespace: pump-pill-arena
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pump-pill-arena-backend
  template:
    metadata:
      labels:
        app: pump-pill-arena-backend
    spec:
      containers:
      - name: backend
        image: pump-pill-arena-backend:latest
        ports:
        - containerPort: 4000
        envFrom:
        - configMapRef:
            name: pump-pill-arena-config
        - secretRef:
            name: pump-pill-arena-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: pump-pill-arena-backend-service
  namespace: pump-pill-arena
spec:
  selector:
    app: pump-pill-arena-backend
  ports:
  - port: 80
    targetPort: 4000
  type: LoadBalancer
```

#### 6. Deploy to Kubernetes
```bash
# Apply configurations
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f backend-deployment.yaml

# Check deployment status
kubectl get pods -n pump-pill-arena
kubectl get services -n pump-pill-arena
```

## SSL/TLS Configuration

### Let's Encrypt with Cert-Manager
```yaml
# cert-manager.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: pump-pill-arena-tls
  namespace: pump-pill-arena
spec:
  secretName: pump-pill-arena-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - pumppillarena.com
  - api.pumppillarena.com
```

### NGINX Ingress
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: pump-pill-arena-ingress
  namespace: pump-pill-arena
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - pumppillarena.com
    - api.pumppillarena.com
    secretName: pump-pill-arena-tls
  rules:
  - host: pumppillarena.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: pump-pill-arena-frontend-service
            port:
              number: 80
  - host: api.pumppillarena.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: pump-pill-arena-backend-service
            port:
              number: 80
```

## Monitoring Setup

### Prometheus Configuration
```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'pump-pill-arena-backend'
      static_configs:
      - targets: ['pump-pill-arena-backend-service:80']
      metrics_path: '/metrics'
      scrape_interval: 5s
```

### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Pump Pill Arena Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

## Health Checks

### Application Health Endpoints
```typescript
// Health check implementation
app.get('/healthz', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      blockchain: await checkBlockchain()
    }
  };
  
  const isHealthy = Object.values(health.services).every(status => status === 'healthy');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### Kubernetes Health Checks
```yaml
# Health check probes
livenessProbe:
  httpGet:
    path: /healthz
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /healthz
    port: 4000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

## Backup Strategy

### Database Backup
```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="pump_pill_arena_backup_$DATE.sql"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE.gz s3://pump-pill-arena-backups/

# Cleanup local files
rm $BACKUP_FILE.gz
```

### Automated Backup Cron Job
```bash
# Add to crontab
0 2 * * * /path/to/backup-database.sh
```

## Rollback Procedures

### Application Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/pump-pill-arena-frontend -n pump-pill-arena
kubectl rollout undo deployment/pump-pill-arena-backend -n pump-pill-arena

# Check rollback status
kubectl rollout status deployment/pump-pill-arena-frontend -n pump-pill-arena
```

### Database Rollback
```bash
# Restore from backup
gunzip pump_pill_arena_backup_20240115_020000.sql.gz
psql $DATABASE_URL < pump_pill_arena_backup_20240115_020000.sql
```

## Security Checklist

### Pre-deployment Security
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] SSL certificates valid
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error handling secure
- [ ] Logging configured
- [ ] Monitoring enabled
- [ ] Backup strategy tested

### Post-deployment Security
- [ ] Health checks passing
- [ ] SSL certificate valid
- [ ] Database connections secure
- [ ] API endpoints protected
- [ ] Monitoring alerts configured
- [ ] Backup verification
- [ ] Performance metrics normal
- [ ] Error rates acceptable
- [ ] Security scan completed
- [ ] Penetration testing scheduled

---

*This deployment guide provides comprehensive instructions for deploying Pump Pill Arena to production environments with security, monitoring, and backup considerations.*
