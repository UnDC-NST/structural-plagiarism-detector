# Technical Glossary & Cheat Sheet

Quick reference for all technical terms, concepts, and formulas used in the Structural Plagiarism Detector project.

---

## Core Concepts

### Abstract Syntax Tree (AST)
**Definition:** Tree representation of the syntactic structure of source code.  
**Example:** `def foo(): return 1` → tree with nodes for module, function_definition, return_statement, number  
**Why important:** Structure-based comparison, immune to variable renaming  
**Tool used:** Tree-sitter parser

### Structural Similarity
**Definition:** Measure of how similar two code structures are, ignoring names and values.  
**Formula:** `cosine_similarity(vector_A, vector_B)`  
**Range:** 0.0 (completely different) to 1.0 (identical)  
**Threshold:** 0.85 (85%) flags potential plagiarism

### Multi-Tenancy
**Definition:** Single application instance serving multiple customers (tenants) with data isolation.  
**Implementation:** Each organization has unique `organizationId`, queries filtered by ID  
**Benefit:** Cost-efficient (one server, many customers), secure (data isolation)

---

## Algorithm Components

### 1. Parsing
**Input:** Raw source code (string)  
**Output:** Abstract Syntax Tree (AST)  
**Tool:** Tree-sitter  
**Speed:** 10,000+ lines per second  
**Example:** `def foo(): pass` → SyntaxNode tree

### 2. Normalization
**Input:** AST with all details  
**Output:** AST with only structural node types  
**Process:** Strip identifiers, literals, comments, operators  
**Example:** Remove `factorial` (name), keep `function_definition` (type)

### 3. Serialization
**Input:** Normalized AST  
**Output:** Sequence of "type:depth" tokens  
**Method:** Pre-order Depth-First Search (DFS)  
**Example:** `["module:0", "function_definition:1", "if_statement:2"]`

### 4. Vectorization
**Input:** Token sequence  
**Output:** Frequency vector with depth weighting  
**Formula:** `freq[type] += 1 / (depth + 1)`  
**Example:** `{ module: 1.0, function_definition: 0.5, if_statement: 0.33 }`

### 5. Similarity Computation
**Input:** Two frequency vectors  
**Output:** Similarity score (0.0 - 1.0)  
**Method:** Cosine similarity  
**Formula:** `(A · B) / (||A|| × ||B||)`

---

## Mathematical Formulas

### Depth Weight
```
weight = 1 / (depth + 1)

Examples:
depth 0: 1/(0+1) = 1.0
depth 1: 1/(1+1) = 0.5
depth 2: 1/(2+1) = 0.33
depth 5: 1/(5+1) = 0.167
```

### Cosine Similarity
```
similarity = (A · B) / (||A|| × ||B||)

Where:
- A · B = dot product = Σ(A[i] × B[i]) for common keys
- ||A|| = magnitude = sqrt(Σ(A[i]²))
- ||B|| = magnitude = sqrt(Σ(B[i]²))
```

**Example:**
```
A = {func: 0.5, if: 0.3}
B = {func: 0.5, while: 0.3}

Dot product = 0.5 × 0.5 = 0.25
||A|| = sqrt(0.5² + 0.3²) = sqrt(0.34) = 0.583
||B|| = sqrt(0.5² + 0.3²) = sqrt(0.34) = 0.583

similarity = 0.25 / (0.583 × 0.583) = 0.25 / 0.34 = 0.735
```

### Bulk Comparison Count
```
comparisons = N × (N - 1) / 2

Examples:
10 files: 10 × 9 / 2 = 45 comparisons
25 files: 25 × 24 / 2 = 300 comparisons
50 files: 50 × 49 / 2 = 1,225 comparisons
```

---

## Design Patterns Quick Reference

| Pattern | Purpose | Example in Project |
|---------|---------|-------------------|
| **Repository** | Abstract data access | `ISubmissionRepository` with MongoDB/InMemory implementations |
| **Circuit Breaker** | Prevent cascading failures | Parser service with auto-recovery |
| **Strategy** | Interchangeable algorithms | Language-specific parsers/normalizers |
| **Factory** | Object creation | `createAuthMiddleware(organizationService)` |
| **Observer** | Event notification | Metrics tracking across operations |
| **Decorator** | Add behavior dynamically | `EnhancedSubmissionService` adds caching |
| **Singleton** | Single instance | Cache, DB connections in container |
| **Composite** | Uniform tree handling | Recursive AST traversal |

---

## SOLID Principles

| Principle | Definition | Example |
|-----------|-----------|---------|
| **S**ingle Responsibility | One class, one job | `ParserService` only parses |
| **O**pen/Closed | Open for extension, closed for modification | Add languages via interface |
| **L**iskov Substitution | Subtypes replaceable | Any `ISubmissionRepository` works |
| **I**nterface Segregation | Clients use only what they need | Separate interfaces per concern |
| **D**ependency Inversion | Depend on abstractions | Controllers use interfaces, not classes |

---

## API Response Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| **200** | OK | Successful GET/POST (analysis, comparison) |
| **201** | Created | Resource created (submission, organization) |
| **400** | Bad Request | Invalid input (validation error) |
| **401** | Unauthorized | Missing or invalid API key |
| **403** | Forbidden | Organization inactive |
| **404** | Not Found | Resource doesn't exist |
| **429** | Too Many Requests | Rate limit or usage quota exceeded |
| **500** | Internal Server Error | Unexpected server error |
| **503** | Service Unavailable | Circuit breaker open, service down |

---

## Performance Metrics

### Response Times (with 70% cache hit rate)
| Operation | Time | Notes |
|-----------|------|-------|
| Single file analysis | 60ms | p95 |
| Two file comparison | 15ms | p95 |
| Bulk 10 files (45 pairs) | 0.7s | No cache |
| Bulk 25 files (300 pairs) | 4.5s | 70% cache |
| Bulk 50 files (1,225 pairs) | 18s | 80% cache |

### Cache Configuration
| Type | TTL | Purpose |
|------|-----|---------|
| Corpus data | 5 min | Submission lists per language+org |
| Analysis results | 1 hour | Code similarity scores |
| Comparison results | 1 hour | File pair similarities |

### Circuit Breaker
| Parameter | Value | Purpose |
|-----------|-------|---------|
| Failure threshold | 5 | Open after 5 failures |
| Success threshold | 2 | Close after 2 successes |
| Timeout | 60s | Try again after 60 seconds |
| Monitoring window | 10s | Count failures in 10s window |

---

## Organization Plans

| Plan | Submissions | Comparisons | File Size | Bulk Files | Price |
|------|-------------|-------------|-----------|------------|-------|
| **Free** | 100/month | 500/month | 1 MB | 10 | $0 |
| **Basic** | 1,000/month | 5,000/month | 5 MB | 25 | $99/mo |
| **Pro** | 10,000/month | 50,000/month | 10 MB | 50 | $499/mo |
| **Enterprise** | Unlimited | Unlimited | 50 MB | 100 | Custom |

---

## MongoDB Schema Summary

### Organization
```typescript
{
  name: string,
  email: string (unique, indexed),
  apiKey: string (unique, indexed),
  plan: 'free' | 'basic' | 'pro' | 'enterprise',
  isActive: boolean,
  limits: {
    maxSubmissionsPerMonth: number,
    maxComparisonsPerMonth: number,
    maxFileSizeBytes: number,
    maxBulkFiles: number
  },
  usage: {
    submissionsThisMonth: number,
    comparisonsThisMonth: number,
    lastResetDate: Date
  }
}
```

### Submission
```typescript
{
  organizationId: ObjectId (indexed, ref: Organization),
  code: string,
  language: string (indexed),
  serializedAST: string[],
  vector: { [nodeType: string]: number },
  metadata: {
    lineCount: number,
    nodeCount: number,
    depth: number
  },
  createdAt: Date
}
```

### Indexes
```
- Organization: { apiKey: 1 }, { email: 1 }
- Submission: { organizationId: 1, language: 1 }, { createdAt: 1 }
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment (development/production) |
| `PORT` | 3000 | Server port |
| `MONGODB_URI` | localhost | MongoDB connection string |
| `USE_IN_MEMORY_DB` | false | Use in-memory storage (dev only) |
| `API_KEY` | dev-key | Default API key (dev only) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (15 min) |
| `CACHE_TTL_SECONDS` | 300 | Default cache TTL (5 min) |
| `LOG_LEVEL` | info | Logging level (error/warn/info/debug) |

---

## Health Check Endpoints

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `/health` | Detailed health status | Monitoring dashboards |
| `/health/liveness` | Is app alive? | Kubernetes liveness probe |
| `/health/readiness` | Ready for traffic? | Kubernetes readiness probe |
| `/metrics` | JSON metrics | Application monitoring |
| `/metrics/prometheus` | Prometheus format | Prometheus scraping |
| `/metrics/cache-stats` | Cache performance | Performance tuning |
| `/metrics/circuit-breakers` | Circuit states | Failure investigation |

---

## Common Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start dev server (hot reload)
npm run typecheck       # Type check without building
npm run build           # Compile TypeScript
npm start               # Run production build
```

### Docker
```bash
docker-compose up -d                    # Start all services
docker-compose up -d --scale api=3      # Start 3 API instances
docker-compose logs -f api              # View logs
docker-compose down                     # Stop services
docker-compose --profile monitoring up  # Start with Prometheus+Grafana
```

### Testing
```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Database
```bash
mongosh                                    # Connect to MongoDB
use plagiarism_detector                    # Select database
db.submissions.countDocuments()            # Count submissions
db.organizations.find()                    # List organizations
db.submissions.find({organizationId: ...}) # Find by org
```

---

## Similarity Score Interpretation

| Range | Interpretation | Action |
|-------|----------------|--------|
| **0.0 - 0.3** | Not similar | Different code structure |
| **0.3 - 0.5** | Slightly similar | Common patterns (loops, conditionals) |
| **0.5 - 0.7** | Somewhat similar | Shared algorithms |
| **0.7 - 0.85** | Similar | Related code, possibly same approach |
| **0.85 - 0.95** | Very similar | **Flag for review** 🚩 |
| **0.95 - 1.0** | Nearly identical | **High plagiarism risk** 🚨 |

---

## Key Numbers to Memorize

### Thresholds
- **Plagiarism threshold:** 0.85 (85%)
- **High confidence:** 0.90+ (90%+)
- **Rate limit:** 100 requests per 15 minutes
- **Graceful shutdown timeout:** 30 seconds

### Performance
- **Cache hit rate:** 70-90%
- **Parser speed:** 10,000+ lines/second
- **Target response time:** <100ms (p95)

### Plans
- **Free:** 100 sub + 500 comp
- **Basic:** 1K sub + 5K comp
- **Pro:** 10K sub + 50K comp
- **Enterprise:** Unlimited

### Circuit Breaker
- **Open after:** 5 failures
- **Retry after:** 60 seconds
- **Close after:** 2 successes

---

## Tree Traversal Methods

### Pre-order (used in this project)
**Order:** Root → Left → Right  
**Use case:** Serialization (structure first)  
**Example:** Function → Parameters → Body

### In-order
**Order:** Left → Root → Right  
**Use case:** Binary search trees  
**Not used in AST traversal**

### Post-order
**Order:** Left → Right → Root  
**Use case:** Evaluating expressions  
**Not used in this project**

---

## Acronyms & Abbreviations

- **AST:** Abstract Syntax Tree
- **DFS:** Depth-First Search
- **TTL:** Time To Live (cache expiration)
- **LRU:** Least Recently Used (cache eviction)
- **API:** Application Programming Interface
- **REST:** Representational State Transfer
- **CORS:** Cross-Origin Resource Sharing
- **SOLID:** Single/Open/Liskov/Interface/Dependency principles
- **OOP:** Object-Oriented Programming
- **ODM:** Object Document Mapper (Mongoose)
- **CI/CD:** Continuous Integration/Continuous Deployment
- **p50/p95/p99:** 50th/95th/99th percentile latency

---

## HTTP Headers Used

| Header | Purpose | Example |
|--------|---------|---------|
| `x-api-key` | Authentication | `spd_abc123...` |
| `Content-Type` | Request format | `application/json` |
| `x-correlation-id` | Request tracing | `req-uuid-123` |
| `x-response-time` | Performance tracking | `45ms` |
| `Cache-Control` | Cache hints | `max-age=300` |

---

## Error Messages Quick Reference

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid API key" | Wrong or missing key | Check `x-api-key` header |
| "Monthly limit exceeded" | Quota reached | Upgrade plan or wait for reset |
| "Organization account is inactive" | Suspended account | Contact support |
| "Validation error" | Invalid input | Check request body format |
| "Service unavailable" | Circuit breaker open | Wait 60s, retry |
| "Rate limit exceeded" | Too many requests | Wait 15 minutes |

---

## Code Quality Checklist

### Before Viva
- ✅ Know the similarity threshold (0.85)
- ✅ Understand depth weighting formula
- ✅ Explain cosine similarity calculation
- ✅ Describe all 8 design patterns used
- ✅ Explain each SOLID principle with example
- ✅ Know performance metrics (cache hit rate, response times)
- ✅ Understand circuit breaker states
- ✅ Explain multi-tenancy implementation
- ✅ Know plan limits by heart
- ✅ Understand AST normalization process

### Presentation Tips
1. Start with: "What problem does it solve?"
2. Show the rename detection example
3. Draw the architecture diagram
4. Explain one design pattern deeply
5. Demo with curl commands
6. Show metrics dashboard
7. Discuss trade-offs made
8. Mention future improvements

---

## Useful MongoDB Queries

```javascript
// Count submissions per organization
db.submissions.aggregate([
  { $group: { _id: "$organizationId", count: { $sum: 1 } } }
])

// Find organizations near limit
db.organizations.find({
  "usage.submissionsThisMonth": { $gte: "$limits.maxSubmissionsPerMonth" * 0.8 }
})

// Average similarity scores (if stored)
db.comparisons.aggregate([
  { $group: { _id: null, avgScore: { $avg: "$similarityScore" } } }
])

// Most active organizations
db.submissions.aggregate([
  { $group: { _id: "$organizationId", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
])
```

---

## Quick Reference Links

- **Tree-sitter Docs:** https://tree-sitter.github.io/
- **Cosine Similarity:** https://en.wikipedia.org/wiki/Cosine_similarity
- **SOLID Principles:** https://en.wikipedia.org/wiki/SOLID
- **Circuit Breaker Pattern:** https://martinfowler.com/bliki/CircuitBreaker.html
- **Repository Pattern:** https://martinfowler.com/eaaCatalog/repository.html

---

**💡 Pro Tip:** Print this cheat sheet or keep it open during your viva for quick reference!
