# 🚀 Quick Start Guide - Enhanced System

## New Features at a Glance

### 1. Monitoring Dashboard

```bash
# Check overall health
curl http://localhost:3000/health

# Get performance metrics
curl http://localhost:3000/metrics

# Check circuit breaker status
curl http://localhost:3000/circuit-breakers

# Check cache statistics
curl http://localhost:3000/cache/stats
```

### 2. Configuration

Create `.env` file:

```bash
# Minimum required for production
NODE_ENV=production
API_KEY=your-32-character-minimum-api-key-here
MONGO_URI=mongodb://localhost:27017/plagiarism-detector

# Optional (defaults shown)
PORT=3000
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300
MONGO_POOL_SIZE=10
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Development Mode

```bash
# Start with in-memory database (no MongoDB needed)
USE_IN_MEMORY_DB=true npm run dev

# Start with MongoDB
npm run dev
```

### 4. Production Deployment

```bash
# Build
npm run build

# Start
NODE_ENV=production npm start
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                          │
│  (Correlation ID, Metrics, Rate Limiting, Auth)         │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
   ┌────▼────┐       ┌───▼─────┐
   │  Cache  │       │ Circuit │
   │  Layer  │       │ Breaker │
   └────┬────┘       └───┬─────┘
        │                │
        └────────┬───────┘
                 │
        ┌────────▼────────┐
        │   Controllers   │
        │  (API Endpoints)│
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │    Services     │
        │ (Business Logic)│
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │   Repository    │
        │  (Data Access)  │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │    MongoDB      │
        └─────────────────┘
```

## Key Components

### Caching Layer
- **Automatic**: Code parsing results cached
- **Hit Rate**: Typically 70-90%
- **TTL**: 5 minutes (configurable)
- **Eviction**: LRU (Least Recently Used)

### Circuit Breaker
- **Threshold**: 5 failures (configurable)
- **Timeout**: 60 seconds before retry
- **States**: CLOSED → OPEN → HALF_OPEN → CLOSED
- **Protects**: Database, External APIs

### Health Checks
- **Liveness**: Is app running?
- **Readiness**: Can accept traffic?
- **Components**: Database, Memory, Disk

### Metrics
- Request counts and timing
- Error rates
- Cache hit rates
- Database query performance
- Memory usage

## Common Operations

### Check System Health

```bash
# Quick health check
curl http://localhost:3000/health/liveness

# Detailed health with all components
curl http://localhost:3000/health

# Response:
{
  "status": "healthy",
  "timestamp": "2026-03-01T12:00:00.000Z",
  "uptime": 3600,
  "components": {
    "database": {
      "status": "healthy",
      "message": "Database connection active",
      "responseTime": 5
    },
    "memory": {
      "status": "healthy",
      "message": "Memory usage at 45.23%"
    }
  }
}
```

### View Metrics

```bash
curl http://localhost:3000/metrics

# Response:
{
  "uptime": "3600s",
  "requests": {
    "total": 1500,
    "errors": 10,
    "errorRate": "0.67%",
    "byEndpoint": {
      "POST /api/v1/analyze": {
        "totalRequests": 800,
        "avgDuration": 45,
        "p95": 120,
        "p99": 250
      }
    }
  },
  "cache": {
    "hits": 560,
    "misses": 240,
    "hitRate": "70.00%"
  }
}
```

### Circuit Breaker Status

```bash
curl http://localhost:3000/circuit-breakers

# Response:
{
  "mongodb": {
    "serviceName": "mongodb",
    "state": "CLOSED",
    "failureCount": 0,
    "successCount": 0,
    "lastFailureTime": null,
    "nextAttemptTime": null
  }
}
```

## Troubleshooting

### Database Connection Issues

**Problem**: Circuit breaker shows OPEN state

**Solution**:
1. Check MongoDB is running
2. Verify connection string
3. Check network connectivity
4. Wait for circuit breaker to auto-recover (60s default)

### High Memory Usage

**Problem**: Memory health indicator shows DEGRADED

**Solution**:
1. Check cache size: `GET /cache/stats`
2. Reduce `CACHE_MAX_SIZE` in config
3. Restart application
4. Consider horizontal scaling

### Slow Response Times

**Problem**: High p95/p99 latencies

**Solution**:
1. Check cache hit rate: `GET /cache/stats`
2. Increase `CACHE_TTL_SECONDS`
3. Check database query performance
4. Add database indexes if needed

### Rate Limiting

**Problem**: Getting 429 Too Many Requests

**Solution**:
1. Increase `RATE_LIMIT_MAX_REQUESTS`
2. Implement per-user rate limiting
3. Use exponential backoff on client

## Performance Tuning

### Cache Optimization

```bash
# High traffic scenarios
CACHE_MAX_SIZE=5000
CACHE_TTL_SECONDS=600

# Low memory scenarios
CACHE_MAX_SIZE=500
CACHE_TTL_SECONDS=180
```

### Database Optimization

```bash
# High concurrency
MONGO_POOL_SIZE=20

# Limited resources
MONGO_POOL_SIZE=5
```

### Circuit Breaker Tuning

```bash
# More tolerant (fewer false positives)
CIRCUIT_BREAKER_THRESHOLD=10
CIRCUIT_BREAKER_TIMEOUT=120000

# More sensitive (fail fast)
CIRCUIT_BREAKER_THRESHOLD=3
CIRCUIT_BREAKER_TIMEOUT=30000
```

## Monitoring Setup

### Kubernetes

```yaml
# Liveness probe
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

# Readiness probe
readinessProbe:
  httpGet:
    path: /health/readiness
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'plagiarism-detector'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics/prometheus'
```

### Grafana Dashboard

Import metrics from `/metrics` endpoint to visualize:
- Request rate
- Response time percentiles
- Error rate
- Cache hit rate
- Memory usage
- Circuit breaker states

## Best Practices

1. **Always enable caching** in production
2. **Monitor circuit breaker state** - if frequently OPEN, investigate root cause
3. **Set up alerts** for health status changes
4. **Review metrics** regularly for performance trends
5. **Use correlation IDs** for debugging production issues
6. **Configure proper rate limits** for your use case
7. **Set appropriate connection pool size** based on traffic
8. **Enable structured logging** for better observability

## Support

For issues or questions:
- Check system health: `GET /health`
- Review metrics: `GET /metrics`
- Check circuit breakers: `GET /circuit-breakers`
- View logs with correlation IDs

---

**Documentation**: See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for complete architecture details
