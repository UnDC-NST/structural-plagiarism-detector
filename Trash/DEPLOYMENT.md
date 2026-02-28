# Production Deployment Guide

## Quick Production Deployment

### Prerequisites
- Node.js 18 or higher
- Docker and Docker Compose
- MongoDB 8.0 or higher (if not using Docker)
- Git

### Option 1: Docker Compose (Recommended)

1. **Clone and configure**
```bash
git clone <your-repo>
cd structural-plagiarism-detector
cp .env.example .env
# Edit .env with production values
```

2. **Start all services**
```bash
docker-compose up -d
```

3. **Health check**
```bash
curl http://localhost:3000/health
```

4. **View logs**
```bash
docker-compose logs -f api
```

### Option 2: Docker Build

1. **Build image**
```bash
npm run docker:build
```

2. **Run container**
```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name plagiarism-api \
  plagiarism-detector:latest
```

3. **Check health**
```bash
npm run health
```

### Option 3: Manual Deployment

1. **Install dependencies**
```bash
npm install --production
```

2. **Build TypeScript**
```bash
npm run build
```

3. **Start production server**
```bash
npm run start:prod
```

---

## Monitoring Stack

### Prometheus & Grafana

1. **Start with monitoring**
```bash
docker-compose --profile monitoring up -d
```

2. **Access Prometheus**: http://localhost:9090
   - Query: `http_requests_total`
   - Query: `http_request_duration_p95`

3. **Access Grafana**: http://localhost:3001
   - Default credentials: admin/admin
   - Add Prometheus datasource: http://prometheus:9090

### Metrics Endpoints

- **JSON Metrics**: GET `/metrics`
- **Prometheus Format**: GET `/metrics/prometheus`
- **Health Check**: GET `/health`
- **Liveness Probe**: GET `/health/liveness`
- **Readiness Probe**: GET `/health/readiness`

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) runs on every push:

1. **Lint** - TypeScript compilation check
2. **Security Audit** - npm audit + TruffleHog secret scanning
3. **Build** - Compile and run tests with MongoDB
4. **Docker** - Build and test container
5. **Deploy** - Deploy to production (configure your deployment method)

### Setup CI/CD

1. **Add GitHub Secrets**:
   - `DOCKER_USERNAME` - Docker Hub username
   - `DOCKER_PASSWORD` - Docker Hub password
   - `DEPLOY_KEY` - SSH key for deployment server (optional)

2. **Push to trigger**:
```bash
git push origin main
```

---

## Kubernetes Deployment (Optional)

### Create Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: plagiarism-detector
spec:
  replicas: 3
  selector:
    matchLabels:
      app: plagiarism-detector
  template:
    metadata:
      labels:
        app: plagiarism-detector
    spec:
      containers:
      - name: api
        image: plagiarism-detector:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: plagiarism-config
        - secretRef:
            name: plagiarism-secrets
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Create Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: plagiarism-detector
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: plagiarism-detector
```

### Apply

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

---

## Production Checklist

- [ ] Set `NODE_ENV=production` in .env
- [ ] Generate strong `API_KEY` (at least 32 characters)
- [ ] Configure `MONGO_URI` with production database
- [ ] Set appropriate `RATE_LIMIT_MAX_REQUESTS`
- [ ] Configure `ALLOWED_ORIGINS` for CORS
- [ ] Enable MongoDB replica set for transactions
- [ ] Set up SSL/TLS certificates (use reverse proxy like nginx)
- [ ] Configure log aggregation (ELK, Splunk, etc.)
- [ ] Set up automated backups for MongoDB
- [ ] Configure monitoring alerts in Prometheus/Grafana
- [ ] Test graceful shutdown (SIGTERM handling)
- [ ] Run load tests to validate circuit breaker thresholds
- [ ] Document API for consumers
- [ ] Set up error tracking (Sentry, Rollbar, etc.)

---

## Troubleshooting

### Container fails to start
```bash
# Check logs
docker-compose logs api

# Common issues:
# - Missing .env file → Copy .env.example to .env
# - Port 3000 in use → Change PORT in .env
# - MongoDB connection failed → Check MONGO_URI
```

### High memory usage
```bash
# Check metrics
curl http://localhost:3000/metrics

# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096" npm run start:prod
```

### Circuit breaker open
```bash
# Check circuit breaker status
curl http://localhost:3000/metrics/circuit-breakers

# Reset circuit breakers (restart required)
docker-compose restart api
```

### Database connection issues
```bash
# Test MongoDB connection
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check connection pool
curl http://localhost:3000/health | jq '.components.database'
```

---

## Performance Tuning

### Cache Configuration
Adjust in `.env`:
```
CACHE_MAX_SIZE=1000        # Increase for more cached items
CACHE_TTL_SECONDS=3600     # Increase for longer cache duration
```

### Circuit Breaker Tuning
Adjust in `src/config/Config.ts`:
```typescript
circuitBreakerFailureThreshold: 10,  // More failures before opening
circuitBreakerResetTimeout: 120000,  // Longer cooldown period
```

### MongoDB Connection Pool
Adjust in `.env`:
```
MONGO_POOL_SIZE=20         # Increase for high concurrency
```

### Rate Limiting
Adjust in `.env`:
```
RATE_LIMIT_MAX_REQUESTS=200    # More requests per window
RATE_LIMIT_WINDOW_MS=60000     # Longer time window
```

---

## Scaling Recommendations

1. **Horizontal Scaling**: Deploy multiple API instances behind a load balancer
2. **Database Scaling**: Use MongoDB sharding for large datasets
3. **Caching**: Implement Redis cluster for distributed caching
4. **CDN**: Use CDN for static assets if serving web interface
5. **Queue System**: Add Bull/BullMQ for async plagiarism detection jobs
6. **Monitoring**: Use Prometheus federation for multi-cluster monitoring

---

## Security Best Practices

1. **API Key Rotation**: Rotate API keys regularly
2. **Rate Limiting**: Adjust based on traffic patterns
3. **HTTPS Only**: Use reverse proxy (nginx/Traefik) with SSL
4. **Network Segmentation**: Isolate database in private network
5. **Secrets Management**: Use HashiCorp Vault or AWS Secrets Manager
6. **Security Scanning**: Run `npm audit` regularly
7. **Container Scanning**: Use Trivy or Snyk for image scanning
8. **Dependency Updates**: Keep dependencies up to date

---

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review metrics: `http://localhost:3000/metrics`
- Check health: `http://localhost:3000/health`
- Review documentation: `SYSTEM_DESIGN.md`
