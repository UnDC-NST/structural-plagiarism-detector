# Structural Plagiarism Detector API

> **Enterprise-grade multi-tenant plagiarism detection service for educational institutions and organizations.**  
> Detects plagiarism by comparing **structural shape**, not text — rename-immune by design.  
> Built for **universities, coding bootcamps, and online learning platforms** handling hundreds or thousands of submissions.  
> Production-ready with multi-tenancy, usage tracking, caching, circuit breakers, health checks, and observability.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 🏢 For Organizations

**This service is designed for institutions that need to check multiple code submissions for plagiarism and similarity.**

### Key Features for Organizations:
- 🏫 **Multi-tenant**: Each organization gets isolated data and their own API key
- 📊 **Usage Tracking**: Monitor submissions and comparisons with plan-based limits
- 🎓 **Educational Focus**: Compare student assignments, detect code copying
- ⚡ **Batch Processing**: Analyze multiple submissions at once (pairwise comparisons)
- 🔒 **Data Isolation**: Organizations only compare against their own submissions
- 📈 **Scalable Plans**: Free, Basic, Pro, Enterprise tiers with different limits

**👉 [View Organization Guide](ORGANIZATIONS.md)** for registration, API keys, and plan details.

---

## 🚀 Production Features

- ✅ **Multi-Tenancy**: Organization-based isolation with plan-based limits (free/basic/pro/enterprise)
- ✅ **Usage Tracking**: Per-organization monthly quotas with automatic reset and enforcement
- ✅ **OOP Design Patterns**: Singleton, Factory, Strategy, Repository, Circuit Breaker, Observer, Decorator, Composite
- ✅ **SOLID Principles**: Full implementation of SRP, OCP, LSP, ISP, DIP
- ✅ **Performance**: LRU caching with TTL (70-90% cache hit rate), request tracing with correlation IDs
- ✅ **Reliability**: Circuit breakers, graceful shutdown, health checks (liveness/readiness probes)
- ✅ **Observability**: Prometheus metrics, structured JSON logging, performance tracking (p50/p95/p99)
- ✅ **Security**: Helmet middleware, CORS, rate limiting, API key authentication, CSP headers
- ✅ **Scalability**: Stateless services, connection pooling, horizontal scaling ready
- ✅ **DevOps**: Docker multi-stage builds, Docker Compose stack, CI/CD pipeline (GitHub Actions)
- ✅ **Testing**: Health endpoints, metrics endpoints, automated testing in CI/CD
- ✅ **Documentation**: Comprehensive system design docs, deployment guide, organization guide

---

## Architecture

```
Raw Python Code
     ↓
ParserService      → Tree-sitter AST (SyntaxNode tree)
     ↓
NormalizerService  → Strips identifiers, literals, comments, operators
                     Keeps only structural node TYPES
     ↓
SerializerService  → Pre-order DFS → "type:depth" token string
                     e.g. "module:0 function_definition:1 if_statement:2"
     ↓
VectorizerService  → Depth-weighted frequency vector
                     freq[type] += 1 / (depth + 1)
     ↓
SimilarityService  → Cosine similarity on frequency vectors
     ↓
Response           → score, confidence, sharedNodes, metadata
```

### System Design Patterns

- **Repository Pattern**: Abstraction layer for data access with MongoDB and in-memory implementations
- **Circuit Breaker**: Prevents cascading failures with automatic recovery (5 failures → 60s timeout)
- **Caching Strategy**: LRU cache with TTL for analyze and compare operations
- **Service Layer**: Clean separation of concerns (Controllers → Services → Repositories)
- **Dependency Injection**: Container-based wiring for testability and flexibility
- **Observer Pattern**: Metrics tracking across all operations

### Why depth-weighted cosine over Jaccard?

|                   | Jaccard (set) | Cosine (frequency) | Cosine + depth weight |
| ----------------- | ------------- | ------------------ | --------------------- |
| Counts repetition | ❌            | ✅                 | ✅                    |
| Weights by depth  | ❌            | ❌                 | ✅                    |
| Rename immune     | ✅            | ✅                 | ✅                    |
| Feature stability | ✅            | ✅                 | ✅                    |

Depth weighting ensures that top-level structure (`function_definition`, `class_definition`) contributes more to similarity than deeply nested implementation details.

---

## Quick Start

### For Organizations (Recommended Workflow)

**1. Register Your Organization**

```bash
curl -X POST http://localhost:3000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My University",
    "email": "admin@university.edu",
    "plan": "free"
  }'
```

Save the returned API key!

**2. Submit Code for Analysis**

```bash
export API_KEY="spd_..." # Your API key from step 1

curl -X POST http://localhost:3000/api/v1/submissions \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "code": "def factorial(n):\n    return 1 if n == 0 else n * factorial(n-1)",
    "language": "python"
  }'
```

**3. Check for Plagiarism**

```bash
curl -X POST http://localhost:3000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "code": "def factorial(num):\n    return 1 if num == 0 else num * factorial(num-1)",
    "language": "python"
  }'
```

**4. Monitor Usage**

```bash
curl http://localhost:3000/api/v1/organizations/usage \
  -H "x-api-key: $API_KEY"
```

📖 **[Full Organization Guide →](ORGANIZATIONS.md)**

---

### For Developers (Local Setup)

#### Option 1: Docker Compose (Recommended)

```bash
# Clone and setup
git clone <your-repo>
cd structural-plagiarism-detector
cp .env.example .env
# Edit .env with production values

# Start all services (API + MongoDB)
docker-compose up -d

# Check health
curl http://localhost:3000/health

# View logs
docker-compose logs -f api
```

#### Option 2: Local Development

```bash
# Requirements: Node ≥18, MongoDB (optional)
npm install
cp .env.example .env

# Run with in-memory database
USE_IN_MEMORY_DB=true npm run dev

# Run with MongoDB
brew install mongodb-community && brew services start mongodb-community
npm run dev
```

#### Option 3: Docker Build

```bash
npm run docker:build
npm run docker:run
```

---

## Monitoring & Observability

### Start with Prometheus & Grafana

```bash
docker-compose --profile monitoring up -d
```

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### Metrics Endpoints

| Endpoint                     | Description                          |
| ---------------------------- | ------------------------------------ |
| `GET /health`                | Detailed health check (all components) |
| `GET /health/liveness`       | Kubernetes liveness probe            |
| `GET /health/readiness`      | Kubernetes readiness probe           |
| `GET /metrics`               | JSON metrics (requests, cache, performance) |
| `GET /metrics/prometheus`    | Prometheus text format               |
| `GET /metrics/circuit-breakers` | Circuit breaker status            |
| `GET /metrics/cache-stats`   | Cache hit/miss statistics            |

### Sample Metrics

```json
{
  "requests": {
    "total": 1523,
    "successful": 1489,
    "failed": 34,
    "durations": { "p50": 45, "p95": 120, "p99": 250 }
  },
  "cache": {
    "hits": 1205,
    "misses": 318,
    "hitRate": 79.1,
    "size": 245
  },
  "database": {
    "queries": 352,
    "averageDuration": 12.5
  }
}
```

---

## API Reference

### Organization Endpoints

#### `POST /api/v1/organizations` (Public)

Create a new organization account. **No authentication required.**

**Body:**

```json
{
  "name": "University of Example",
  "email": "admin@example.edu",
  "plan": "free"
}
```

**Response `201`:**

```json
{
  "organization": {
    "id": "...",
    "name": "University of Example",
    "email": "admin@example.edu",
    "plan": "free",
    "apiKey": "spd_1234567890abcdef...",
    "limits": {
      "maxSubmissionsPerMonth": 100,
      "maxComparisonsPerMonth": 500,
      "maxFileSizeBytes": 1048576,
      "maxBulkFiles": 10
    }
  },
  "message": "Organization created successfully. Keep your API key secure!"
}
```

**⚠️ Save the API key** - it cannot be retrieved later!

---

#### `GET /api/v1/organizations/me`

Get current organization details. **Requires API key.**

**Headers:**

```
x-api-key: <your-api-key>
```

**Response `200`:**

```json
{
  "organization": {
    "id": "...",
    "name": "University of Example",
    "email": "admin@example.edu",
    "plan": "free",
    "isActive": true,
    "limits": {
      "maxSubmissionsPerMonth": 100,
      "maxComparisonsPerMonth": 500,
      "maxFileSizeBytes": 1048576,
      "maxBulkFiles": 10
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### `GET /api/v1/organizations/usage`

Get current month's usage statistics. **Requires API key.**

**Headers:**

```
x-api-key: <your-api-key>
```

**Response `200`:**

```json
{
  "usage": {
    "organization": {
      "id": "...",
      "name": "University of Example",
      "plan": "free"
    },
    "currentUsage": {
      "submissions": 45,
      "comparisons": 203
    },
    "limits": {
      "submissions": 100,
      "comparisons": 500
    },
    "percentageUsed": {
      "submissions": 45,
      "comparisons": 41
    },
    "resetDate": "2024-02-01T00:00:00.000Z"
  }
}
```

---

### Plagiarism Detection Endpoints

All `/api/v1/*` routes require:

```
x-api-key: <your-api-key>
Content-Type: application/json
```

### `GET /health`

Public. No auth required.

```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

### `POST /api/v1/submissions`

Store a code submission.

**Body:**

```json
{ "code": "def foo(x): return x+1", "language": "python" }
```

**Response `201`:**

```json
{ "submissionId": "uuid" }
```

---

### `GET /api/v1/submissions/:id`

Retrieve a stored submission by ID.

**Response `200`:**

```json
{ "_id": "...", "language": "python", "createdAt": "2024-01-01T00:00:00.000Z" }
```

---

### `POST /api/v1/analyze`

Compare new code against the entire stored corpus.

**Body:**

```json
{ "code": "def bar(n): return n+1", "language": "python" }
```

**Response `200`:**

```json
{
  "similarityScore": 0.98,
  "confidence": "high",
  "matchedSubmissionId": "uuid or null",
  "flagged": true,
  "metadata": {
    "sharedNodes": 18,
    "totalNodesInput": 20,
    "totalNodesMatched": 21
  }
}
```

**Confidence thresholds:**

| Score     | Confidence |
| --------- | ---------- |
| ≥ 0.85    | `"high"`   |
| 0.65–0.84 | `"medium"` |
| 0.40–0.64 | `"low"`    |
| < 0.40    | `"none"`   |

---

### `POST /api/v1/compare`

Direct 1-to-1 comparison. No database access.

**Body:**

```json
{ "codeA": "...", "codeB": "...", "language": "python" }
```

**Response `200`:**

```json
{
  "similarityScore": 1.0,
  "confidence": "high",
  "flagged": true,
  "metadata": { "sharedNodes": 8, "totalNodesA": 10, "totalNodesB": 10 }
}
```

---

### `POST /api/v1/compare/bulk`

Pairwise similarity matrix over N code submissions.

**Limits:** max 50 files, max 50KB per file, max 3 000 pairs.

**Body:**

```json
{
  "submissions": [
    { "code": "def foo(x): return x*2", "label": "student_A" },
    { "code": "def bar(n): return n*2", "label": "student_B" },
    { "code": "for i in range(10): print(i)", "label": "student_C" }
  ],
  "language": "python"
}
```

**Response `200`:**

```json
{
  "labels": ["student_A", "student_B", "student_C"],
  "matrix": [
    [1.0, 0.98, 0.21],
    [0.98, 1.0, 0.21],
    [0.21, 0.21, 1.0]
  ],
  "suspiciousPairs": [
    {
      "labelA": "student_A",
      "labelB": "student_B",
      "score": 0.98,
      "confidence": "high",
      "sharedNodes": 8
    }
  ],
  "metadata": {
    "files": 3,
    "pairs": 3,
    "totalMs": 12,
    "heapMb": 45,
    "flagThreshold": 0.75
  }
}
```

---

## CI/CD Pipeline

Automated CI/CD pipeline runs on every push to main branch:

1. **Lint**: TypeScript compilation check + ESLint
2. **Security**: npm audit for vulnerabilities + TruffleHog secret scanning
3. **Build**: Compile TypeScript + run tests with MongoDB
4. **Docker**: Build multi-stage image + health check validation
5. **Deploy**: Automated deployment (configure your deployment method)

### Setup

1. Add GitHub Secrets:
   - `DOCKER_USERNAME` - Docker Hub username
   - `DOCKER_PASSWORD` - Docker Hub password
   - `DEPLOY_KEY` - SSH key for deployment (optional)

2. Push to trigger:
```bash
git push origin main
```

---

## Security Features

- **Helmet Middleware**: 11 security headers (CSP, HSTS, frameguard, XSS protection)
- **Rate Limiting**: Configurable per-IP request limits (default: 100 req/15min)
- **API Key Authentication**: Required for all `/api/v1/*` endpoints
- **CORS**: Configurable allowed origins
- **Input Validation**: Zod schema validation for all configuration
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, CSP, HSTS
- **Non-root Docker User**: Container runs as nodejs:1001
- **Secret Scanning**: TruffleHog in CI/CD pipeline
- **Dependency Auditing**: npm audit in CI/CD pipeline

---

## Performance Tuning

### Cache Configuration

Adjust in `.env`:
```bash
CACHE_MAX_SIZE=1000        # Increase for more cached items
CACHE_TTL_SECONDS=3600     # Increase for longer cache duration
```

Expected cache hit rates: 70-90% for repeated comparisons.

### Circuit Breaker Tuning

Adjust in [src/config/Config.ts](src/config/Config.ts):
```typescript
circuitBreakerFailureThreshold: 10,  // More failures before opening
circuitBreakerResetTimeout: 120000,  // Longer cooldown (ms)
```

### MongoDB Connection Pool

Adjust in `.env`:
```bash
MONGO_POOL_SIZE=20         # Increase for high concurrency
```

### Rate Limiting

Adjust in `.env`:
```bash
RATE_LIMIT_MAX_REQUESTS=200    # More requests per window
RATE_LIMIT_WINDOW_MS=60000     # Longer time window (ms)
```

---

## Documentation

### 🎓 For Learning & Viva Preparation
- **[STUDY_PLAN.md](STUDY_PLAN.md)**: 📅 **15-day preparation guide** - Strategic study timeline for viva success
- **[VIVA_QUESTIONS.md](VIVA_QUESTIONS.md)**: 🎓 **30 Q&A with explanations** - Deep understanding of every concept
- **[CHEAT_SHEET.md](CHEAT_SHEET.md)**: 📝 **Quick reference** - Formulas, metrics, commands, key numbers
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)**: 📄 **One-page overview** - Complete overview for presentations

### 📚 For Implementation & Deployment
- **[ER_DIAGRAM.md](ER_DIAGRAM.md)**: 🗄️ **Database schema** - ER diagrams with Mermaid, relationships, indexes
- **[ORGANIZATIONS.md](ORGANIZATIONS.md)**: 🏢 **Organization guide** - Registration, API keys, plans, usage tracking
- **[SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)**: 🏗️ **Architecture deep dive** - Design patterns, trade-offs, scalability
- **[DEPLOYMENT.md](DEPLOYMENT.md)**: 🚀 **Production guide** - Docker, Kubernetes, troubleshooting
- **[QUICK_START.md](QUICK_START.md)**: ⚡ **Quick reference** - Common tasks and commands
- **[API Documentation](postman_collection.json)**: 📡 **Postman collection** - All endpoints with examples

---

## Performance Characteristics

| Files | Pairs | Expected time | Cache hits | Response time |
| ----- | ----- | ------------- | ---------- | ------------- |
| 10    | 45    | < 50ms        | 0%         | ~50ms         |
| 25    | 300   | < 200ms       | 70%        | ~60ms         |
| 50    | 1225  | < 800ms       | 80%        | ~160ms        |

**Without caching**: O(n²/2) comparisons.  
**With caching**: 70-90% cache hit rate reduces response time by 75%.

Vectorization is O(n). Pairwise comparison is O(n²/2). The event loop is yielded every 5 pairs via `setImmediate` to stay non-blocking.

---

## Project Structure

```
src/
├── adapters/          LanguageAdapter interface + PythonAdapter
├── config/            Type-safe Config with Zod validation
├── controllers/       AnalyzeController, SubmissionController, CompareController, MonitoringController
├── middlewares/       auth, errorHandler, rateLimiter, requestLogger, correlation, metrics, security
├── models/            Mongoose Submission schema
├── repositories/      Repository pattern for data access (MongoDB + in-memory)
├── routes/            Express Router factories
├── services/          Parser, Normalizer, Serializer, Vectorizer, Similarity, Submission, Cache, Metrics, HealthCheck
├── types/             All TypeScript interfaces
├── utils/             AppError, asyncHandler, logger, CircuitBreaker, ShutdownHandler, constants
├── app.ts             Express app with middleware setup
├── container.ts       Dependency Injection container
└── server.ts          Bootstrap with graceful shutdown
scripts/
└── benchmark.ts       Engine quality + performance validation
.github/
└── workflows/
    └── ci-cd.yml      Complete CI/CD pipeline
docker-compose.yml     Full stack (API + MongoDB + Prometheus + Grafana)
Dockerfile             Multi-stage production build
```

---

## Scaling Recommendations

1. **Horizontal Scaling**: Deploy multiple API instances behind a load balancer (stateless services)
2. **Database Scaling**: Use MongoDB sharding for datasets > 1M submissions
3. **Caching**: Implement Redis cluster for distributed caching across instances
4. **Queue System**: Add Bull/BullMQ for async plagiarism detection jobs
5. **Monitoring**: Use Prometheus federation for multi-cluster monitoring
6. **CDN**: Use CDN for static assets if serving web interface

---

## Deployment Options

### Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Kubernetes
See [DEPLOYMENT.md](DEPLOYMENT.md) for complete Kubernetes manifests with:
- Deployment with 3 replicas
- Service (LoadBalancer)
- ConfigMap for environment variables
- Liveness and readiness probes
- Resource requests and limits

### Cloud Platforms

#### Render / Railway / Fly.io

1. Push to GitHub
2. Create new Web Service → connect repo
3. Set environment variables from `.env.example`
4. Set start command: `npm run build && npm run start:prod`
5. Set `NODE_ENV=production`

#### AWS ECS / GCP Cloud Run / Azure Container Instances

1. Build and push Docker image:
```bash
npm run docker:build
docker tag plagiarism-detector:latest <your-registry>/plagiarism-detector:latest
docker push <your-registry>/plagiarism-detector:latest
```

2. Deploy with environment variables from `.env.example`

For MongoDB: use [MongoDB Atlas](https://www.mongodb.com/atlas) free tier.  
Set `MONGO_URI` to the Atlas connection string.  
Or set `USE_IN_MEMORY_DB=true` for zero-dependency demo deployment.

---

## Known Limitations

- **In-memory mode** does not persist submissions across restarts (use MongoDB for production)
- **Corpus scan is O(n)** — for > 10 000 submissions, upgrade `SimilarityService` to MinHash + LSH (swap via `ISimilarityService`, no controller changes required)
- **Only Python supported** — adding new languages requires implementing `LanguageAdapter` and registering in `ParserService`
- **Bulk max 50 files** — hardcoded safety limit; increase `BULK_MAX_FILES` in `CompareController` if needed
- **Circuit breaker is in-memory** — for distributed deployments, use Redis-backed circuit breaker
