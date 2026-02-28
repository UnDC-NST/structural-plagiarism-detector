# Complete Code Review & Architecture Guide

> **Comprehensive explanation of every file, feature, and code flow in the Structural Plagiarism Detector**

---

## 📋 Table of Contents

1. [Quick Answer: Bulk Submissions](#quick-answer-bulk-submissions)
2. [Project Architecture Overview](#project-architecture-overview)
3. [Complete File-by-File Review](#complete-file-by-file-review)
4. [Data Flow Examples](#data-flow-examples)
5. [Feature Deep Dives](#feature-deep-dives)
6. [How Everything Connects](#how-everything-connects)

---

## Quick Answer: Bulk Submissions

### ✅ YES! You Can Submit Multiple Files at Once

**Endpoint:** `POST /api/v1/compare/bulk`

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/v1/compare/bulk \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "submissions": [
      {"code": "def factorial(n): return 1 if n==0 else n*factorial(n-1)", "label": "student_A"},
      {"code": "def fact(x): return 1 if x==0 else x*fact(x-1)", "label": "student_B"},
      {"code": "def compute(n): return 1 if n==0 else n*compute(n-1)", "label": "student_C"}
    ],
    "language": "python"
  }'
```

**What It Does:**
- Compares **every file with every other file** (pairwise)
- 3 files = 3 comparisons (A-B, A-C, B-C)
- 10 files = 45 comparisons
- 25 files = 300 comparisons
- Formula: N × (N-1) / 2

**Response:**
```json
{
  "results": [
    {
      "pair": ["student_A", "student_B"],
      "similarityScore": 0.98,
      "flagged": true
    },
    {
      "pair": ["student_A", "student_C"],
      "similarityScore": 0.97,
      "flagged": true
    },
    {
      "pair": ["student_B", "student_C"],
      "similarityScore": 0.99,
      "flagged": true
    }
  ],
  "summary": {
    "totalPairs": 3,
    "flaggedPairs": 3,
    "averageSimilarity": 0.98
  }
}
```

**Usage Tracking:**
- Uses 3 comparisons from your monthly quota (one per pair)
- Pre-validates you have enough quota before starting
- Detailed error if quota exceeded

---

## Project Architecture Overview

### 🏗️ Layered Architecture

```
┌─────────────────────────────────────────┐
│   CLIENT (curl, Postman, Web App)      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   MIDDLEWARE LAYER                      │
│   - Security (Helmet, CORS)             │
│   - Authentication (API Key)            │
│   - Rate Limiting                       │
│   - Request Logging                     │
│   - Metrics Tracking                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   ROUTES LAYER                          │
│   - /api/v1/submissions                 │
│   - /api/v1/analyze                     │
│   - /api/v1/compare                     │
│   - /api/v1/organizations               │
│   - /health, /metrics                   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   CONTROLLERS LAYER                     │
│   - Request validation                  │
│   - Coordinate services                 │
│   - Format responses                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   SERVICES LAYER                        │
│   - Business Logic                      │
│   - Algorithm Implementation            │
│   - Caching, Metrics                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   REPOSITORIES LAYER                    │
│   - Data Access Abstraction             │
│   - MongoDB/In-Memory implementations   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   DATABASE (MongoDB)                    │
│   - Organizations Collection            │
│   - Submissions Collection              │
└─────────────────────────────────────────┘
```

---

## Complete File-by-File Review

### 📁 Root Configuration Files

#### `package.json`
**Purpose:** Project dependencies and scripts  
**What It Does:**
- Lists all npm packages (express, mongoose, typescript, etc.)
- Defines scripts: `npm run dev`, `npm run build`, `npm start`
- Project metadata (name, version, author)

**Key Dependencies:**
```json
{
  "express": "^4.18.2",          // Web server
  "mongoose": "^7.5.0",          // MongoDB ODM
  "tree-sitter": "^0.20.4",      // AST parser
  "winston": "^3.10.0",          // Logging
  "helmet": "^7.0.0",            // Security headers
  "express-rate-limit": "^6.10.0" // Rate limiting
}
```

---

#### `tsconfig.json`
**Purpose:** TypeScript compiler configuration  
**What It Does:**
- Sets compilation target (ES2020)
- Defines output directory (`dist/`)
- Enables strict type checking
- Configures module resolution

**Key Settings:**
```json
{
  "target": "ES2020",
  "module": "commonjs",
  "outDir": "./dist",
  "strict": true,
  "esModuleInterop": true
}
```

---

#### `Dockerfile`
**Purpose:** Container image definition  
**What It Does:**
- Multi-stage build (build stage + production stage)
- Copies only necessary files to production
- Installs dependencies and compiles TypeScript
- Runs as non-root user for security

**Stages:**
1. **Build Stage:** Compile TypeScript → JavaScript
2. **Production Stage:** Run compiled code with minimal dependencies

---

#### `docker-compose.yml`
**Purpose:** Multi-container orchestration  
**What It Does:**
- Defines 4 services: API, MongoDB, Prometheus, Grafana
- Sets up networking between containers
- Configures volumes for data persistence
- Health checks for containers

**Services:**
```yaml
services:
  api:         # Node.js API server
  mongodb:     # Database
  prometheus:  # Metrics collection (optional)
  grafana:     # Monitoring dashboards (optional)
```

---

#### `.env.example`
**Purpose:** Environment variable template  
**What It Does:**
- Shows all required environment variables
- Documents what each variable does
- Provides sensible defaults

**Key Variables:**
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/plagiarism
API_KEY=your-secure-api-key-here
USE_IN_MEMORY_DB=false
```

---

### 📁 `src/` - Main Source Code

#### `src/server.ts`
**Purpose:** Application entry point  
**What It Does:**
- Initializes database connection
- Starts Express server
- Sets up graceful shutdown
- Handles process signals (SIGTERM, SIGINT)

**Code Flow:**
```typescript
1. Load environment variables
2. Connect to MongoDB (or use in-memory)
3. Import Express app
4. Start listening on port
5. Register shutdown handlers
6. Log startup success
```

**Key Code:**
```typescript
const startServer = async () => {
  // Connect to database
  await connectDatabase();
  
  // Start server
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
  
  // Graceful shutdown
  registerShutdownHandlers(server);
};

startServer();
```

---

#### `src/app.ts`
**Purpose:** Express application configuration  
**What It Does:**
- Configures all middleware (security, logging, CORS)
- Mounts all route handlers
- Sets up error handling
- Exports configured app

**Middleware Stack (IN ORDER):**
```typescript
1. helmet()              // Security headers
2. cors()                // Cross-origin requests
3. express.json()        // Parse JSON bodies
4. correlationMiddleware // Add request IDs
5. metricsMiddleware     // Track request metrics
6. Routes                // API endpoints
7. errorHandler          // Catch all errors
```

**Route Mounting:**
```typescript
app.use('/health', monitoringRouter);              // Health checks
app.use('/metrics', monitoringRouter);             // Metrics
app.use('/api/v1/organizations', organizationRouter); // Organizations
app.use('/api/v1/submissions', authMiddleware, submissionRouter);
app.use('/api/v1/analyze', authMiddleware, analyzeRouter);
app.use('/api/v1/compare', authMiddleware, compareRouter);
```

---

#### `src/container.ts`
**Purpose:** Dependency Injection Container (IoC)  
**What It Does:**
- Creates single instances of all services
- Wires dependencies between components
- Exports configured controllers
- Implements Singleton pattern

**Why It Exists:**
- **Single Source of Truth:** All dependencies created in one place
- **Testability:** Easy to swap implementations for testing
- **Dependency Inversion:** Controllers depend on interfaces, not concrete classes

**Code Structure:**
```typescript
// Create services (bottom layer)
const parserService = new ParserService();
const normalizerService = new NormalizerService();
const serializerService = new SerializerService();
const vectorizerService = new VectorizerService();
const similarityService = new SimilarityService(vectorizerService);

// Create repositories
const submissionRepository = new MongoSubmissionRepository();

// Create enhanced services (with caching)
const enhancedSubmissionService = new EnhancedSubmissionService(
  submissionRepository,
  cacheService,
  metricsService
);

// Create organization service
const organizationService = new OrganizationService();

// Create controllers (top layer) - inject dependencies
const analyzeController = new AnalyzeController(
  enhancedSubmissionService,
  parserService,
  normalizerService,
  serializerService,
  similarityService,
  organizationService
);

// Export everything
export { 
  analyzeController,
  compareController,
  submissionController,
  organizationController,
  organizationService
};
```

**Dependency Graph:**
```
AnalyzeController
  ├─> EnhancedSubmissionService
  │     ├─> SubmissionRepository
  │     ├─> CacheService
  │     └─> MetricsService
  ├─> ParserService
  ├─> NormalizerService
  ├─> SerializerService
  ├─> SimilarityService
  │     └─> VectorizerService
  └─> OrganizationService
```

---

### 📁 `src/config/` - Configuration Management

#### `src/config/Config.ts`
**Purpose:** Centralized configuration with validation  
**What It Does:**
- Reads environment variables
- Provides default values
- Validates configuration
- Type-safe config access

**Singleton Pattern:**
```typescript
class Config {
  private static instance: Config;
  
  private constructor() {
    // Load config from environment
  }
  
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }
  
  public get port(): number { return this.PORT; }
  public get mongoUri(): string { return this.MONGODB_URI; }
}

export default Config.getInstance();
```

---

#### `src/config/index.ts`
**Purpose:** Configuration export and utilities  
**What It Does:**
- Re-exports Config singleton
- Database connection logic
- Environment-specific settings

---

### 📁 `src/models/` - Data Models (Mongoose Schemas)

#### `src/models/Organization.ts`
**Purpose:** Organization data model for multi-tenancy  
**What It Does:**
- Defines MongoDB schema for organizations
- Plan-based limits (free/basic/pro/enterprise)
- Usage tracking with automatic reset
- Instance methods for quota management

**Schema Structure:**
```typescript
{
  name: String,                    // "Stanford University"
  email: String (unique, indexed), // "admin@stanford.edu"
  apiKey: String (unique, indexed),// "spd_abc123..."
  plan: Enum,                      // "free" | "basic" | "pro" | "enterprise"
  isActive: Boolean,               // true (active) or false (suspended)
  
  limits: {
    maxSubmissionsPerMonth: Number,  // 100, 1000, 10000, Infinity
    maxComparisonsPerMonth: Number,  // 500, 5000, 50000, Infinity
    maxFileSizeBytes: Number,        // 1MB, 5MB, 10MB, 50MB
    maxBulkFiles: Number             // 10, 25, 50, 100
  },
  
  usage: {
    submissionsThisMonth: Number,    // Current month's count
    comparisonsThisMonth: Number,    // Current month's count
    lastResetDate: Date              // When usage was last reset
  },
  
  metadata: Object,                  // Additional data
  createdAt: Date,
  updatedAt: Date
}
```

**Instance Methods:**
```typescript
// Check if quota exceeded
organization.hasExceededSubmissionLimit(): boolean
organization.hasExceededComparisonLimit(): boolean

// Reset usage if new month
organization.resetUsageIfNeeded(): void  // Called on every auth

// Increment usage
organization.incrementSubmissionUsage(): void
organization.incrementComparisonUsage(count: number): void
```

**Indexes:**
```typescript
{ apiKey: 1 }  // Fast authentication lookup
{ email: 1 }   // Unique email validation
```

**Example Usage:**
```typescript
// Create organization
const org = await Organization.create({
  name: "My University",
  email: "admin@uni.edu",
  plan: "free",
  apiKey: generateApiKey()
});

// Check limits
if (org.hasExceededSubmissionLimit()) {
  throw new AppError(429, "Monthly submission limit exceeded");
}

// Increment usage
org.incrementSubmissionUsage();
await org.save();
```

---

#### `src/models/Submission.ts`
**Purpose:** Submission data model for plagiarism detection  
**What It Does:**
- Stores original code and processed AST
- Links to owning organization
- Stores serialized AST and frequency vector
- Metadata about code structure

**Schema Structure:**
```typescript
{
  organizationId: ObjectId (ref: Organization, indexed), // Multi-tenant isolation
  code: String,                      // Original source code
  language: Enum,                    // "python" | "javascript"
  serializedAST: [String],          // ["module:0", "function:1", ...]
  vector: {                          // Frequency vector
    module: Number,
    function_definition: Number,
    if_statement: Number,
    // ... all node types
  },
  metadata: {
    lineCount: Number,               // Lines in code
    nodeCount: Number,               // Total AST nodes
    depth: Number,                   // Max AST depth
    size: Number                     // Bytes
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```typescript
{ organizationId: 1, language: 1 }  // Fast org-scoped corpus queries
{ createdAt: 1 }                    // Time-based queries
```

**Example Usage:**
```typescript
// Save submission
const submission = await Submission.create({
  organizationId: org._id,
  code: "def factorial(n): ...",
  language: "python",
  serializedAST: ["module:0", "function_definition:1", ...],
  vector: { module: 1.0, function_definition: 0.5, ... },
  metadata: { lineCount: 5, nodeCount: 20, depth: 3 }
});

// Query org's corpus
const corpus = await Submission.find({
  organizationId: org._id,
  language: "python"
});
```

---

### 📁 `src/repositories/` - Data Access Layer

#### `src/repositories/SubmissionRepository.ts`
**Purpose:** Abstract data access from business logic  
**What It Does:**
- Defines ISubmissionRepository interface
- MongoDB implementation (production)
- In-memory implementation (dev/test)
- Hides database details from services

**Why Repository Pattern:**
- **Abstraction:** Services don't know about MongoDB
- **Testability:** Can swap in-memory for tests
- **Flexibility:** Easy to change database (PostgreSQL, etc.)

**Interface Definition:**
```typescript
interface ISubmissionRepository {
  create(submission: ISubmission): Promise<ISubmission>;
  findById(id: string): Promise<ISubmission | null>;
  findByLanguage(language: string): Promise<ISubmission[]>;
  findByLanguageAndOrg(language: string, orgId: string): Promise<ISubmission[]>;
  deleteById(id: string): Promise<boolean>;
}
```

**MongoDB Implementation:**
```typescript
class MongoSubmissionRepository implements ISubmissionRepository {
  async create(submission: ISubmission): Promise<ISubmission> {
    const doc = await Submission.create(submission);
    return doc.toObject();
  }
  
  async findByLanguageAndOrg(language: string, orgId: string): Promise<ISubmission[]> {
    return await Submission.find({ 
      language, 
      organizationId: orgId 
    }).lean();
  }
  
  // ... other methods
}
```

**In-Memory Implementation:**
```typescript
class InMemorySubmissionRepository implements ISubmissionRepository {
  private submissions: Map<string, ISubmission> = new Map();
  
  async create(submission: ISubmission): Promise<ISubmission> {
    const id = generateId();
    const withId = { ...submission, _id: id };
    this.submissions.set(id, withId);
    return withId;
  }
  
  async findByLanguageAndOrg(language: string, orgId: string): Promise<ISubmission[]> {
    return Array.from(this.submissions.values())
      .filter(s => s.language === language && s.organizationId === orgId);
  }
  
  // ... other methods
}
```

**Usage in Container:**
```typescript
// Choose implementation based on environment
const submissionRepository = config.useInMemoryDb
  ? new InMemorySubmissionRepository()
  : new MongoSubmissionRepository();
```

---

### 📁 `src/services/` - Business Logic Layer

#### `src/services/ParserService.ts`
**Purpose:** Parse code to Abstract Syntax Tree (AST)  
**What It Does:**
- Uses Tree-sitter to parse Python code
- Generates syntax tree from source code
- Handles parsing errors gracefully
- Language-agnostic interface (extensible)

**Algorithm:**
```typescript
Input:  Raw Python code (string)
Output: Tree-sitter SyntaxNode (AST root)

Steps:
1. Initialize Tree-sitter parser
2. Set language (Python/JavaScript)
3. Parse code → syntax tree
4. Return root node
5. Handle errors (syntax errors, empty code)
```

**Code:**
```typescript
class ParserService {
  private parser: Parser;
  
  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(Python); // Set language
  }
  
  parse(code: string, language: string): SyntaxNode {
    try {
      const tree = this.parser.parse(code);
      
      if (tree.rootNode.hasError) {
        throw new AppError(400, "Syntax error in code");
      }
      
      return tree.rootNode;
    } catch (error) {
      logger.error("Parsing failed", { error });
      throw new AppError(500, "Failed to parse code");
    }
  }
}
```

**Example:**
```python
# Input code
def factorial(n):
    return 1 if n == 0 else n * factorial(n-1)

# Output AST (simplified)
module
└── function_definition
    ├── identifier: "factorial"
    ├── parameters
    │   └── identifier: "n"
    └── return_statement
        └── conditional_expression
            ├── comparison: n == 0
            ├── number: 1
            └── binary_operator
                ├── identifier: n
                └── call: factorial(n-1)
```

---

#### `src/services/NormalizerService.ts`
**Purpose:** Strip identifiers and values from AST  
**What It Does:**
- Removes variable/function names
- Removes literal values (strings, numbers)
- Keeps only structural node types
- Makes code "rename-immune"

**Algorithm:**
```typescript
Input:  Tree-sitter SyntaxNode (full AST)
Output: Normalized SyntaxNode (structure only)

Steps:
1. Traverse AST recursively
2. For each node:
   - Keep node TYPE (function_definition, if_statement)
   - Remove node VALUE (actual names, numbers)
3. Return normalized tree
```

**What Gets Removed:**
```typescript
✂️ Identifiers: factorial → [removed]
✂️ Strings: "hello" → [removed]
✂️ Numbers: 42 → [removed]
✂️ Comments: // comment → [removed]
✂️ Operators: + vs - → both become binary_operator

✅ Kept: Node types (function_definition, if_statement, etc.)
```

**Code:**
```typescript
class NormalizerService {
  normalize(node: SyntaxNode): NormalizationResult {
    const typesToRemove = [
      'identifier',      // Variable names
      'string',          // String literals
      'number',          // Numbers
      'comment',         // Comments
      'integer',
      'float'
    ];
    
    const normalizedTokens: string[] = [];
    
    function traverse(node: SyntaxNode, depth: number) {
      // Skip nodes we want to remove
      if (typesToRemove.includes(node.type)) {
        return;
      }
      
      // Keep structural nodes
      normalizedTokens.push(`${node.type}:${depth}`);
      
      // Recurse to children
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    }
    
    traverse(node, 0);
    return { tokens: normalizedTokens };
  }
}
```

**Example:**
```python
# Original code
def calculate_factorial(number):
    if number == 0:
        return 1
    return number * calculate_factorial(number - 1)

# After normalization (tokens)
[
  "module:0",
  "function_definition:1",
  "parameters:2",
  "if_statement:2",
  "comparison_operator:3",
  "return_statement:3",
  "return_statement:2",
  "binary_operator:3",
  "call:3",
  "arguments:4",
  "binary_operator:5"
]

# Notice: No names (calculate_factorial, number), no values (0, 1)
# Only structure remains!
```

---

#### `src/services/SerializerService.ts`
**Purpose:** Convert AST to token sequence  
**What It Does:**
- Traverses AST in pre-order (DFS)
- Generates "type:depth" tokens
- Creates flat array from tree
- Maintains depth information

**Algorithm:**
```typescript
Input:  Normalized SyntaxNode
Output: String array ["type:depth", ...]

Steps:
1. Pre-order depth-first traversal
2. For each node: emit "node.type:depth"
3. Recurse to children with depth+1
4. Return flat token list
```

**Pre-order Traversal:**
```
Visit order: Root → Left subtree → Right subtree

Tree:
      A
     / \
    B   C
   /
  D

Pre-order: A, B, D, C
```

**Code:**
```typescript
class SerializerService {
  serialize(node: SyntaxNode): string[] {
    const tokens: string[] = [];
    
    function traverse(node: SyntaxNode, depth: number) {
      // Emit current node
      tokens.push(`${node.type}:${depth}`);
      
      // Recurse to children
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    }
    
    traverse(node, 0);
    return tokens;
  }
}
```

**Example:**
```typescript
// Input AST
module
└── function_definition
    └── if_statement
        └── return_statement

// Output tokens
[
  "module:0",
  "function_definition:1",
  "if_statement:2",
  "return_statement:3"
]
```

---

#### `src/services/VectorizerService.ts`
**Purpose:** Create depth-weighted frequency vector  
**What It Does:**
- Counts occurrence of each node type
- Weights by depth (1 / (depth + 1))
- Creates frequency vector (object/map)
- Used for similarity calculation

**Algorithm:**
```typescript
Input:  Token array ["type:depth", ...]
Output: Frequency vector { type: weight, ... }

Steps:
1. Initialize empty vector {}
2. For each token "type:depth":
   a. Calculate weight = 1 / (depth + 1)
   b. Add weight to vector[type]
3. Return vector
```

**Depth Weighting Formula:**
```typescript
weight = 1 / (depth + 1)

Examples:
depth 0: 1 / (0+1) = 1.0    ← Most important
depth 1: 1 / (1+1) = 0.5
depth 2: 1 / (2+1) = 0.333
depth 3: 1 / (3+1) = 0.25
depth 5: 1 / (5+1) = 0.167  ← Least important
```

**Why Depth Weighting:**
- Top-level structure (classes, functions) more important
- Deep implementation details less important
- Better captures architectural similarity

**Code:**
```typescript
class VectorizerService {
  vectorize(tokens: string[]): FrequencyVector {
    const vector: FrequencyVector = {};
    
    for (const token of tokens) {
      const [type, depthStr] = token.split(':');
      const depth = parseInt(depthStr, 10);
      
      // Calculate depth weight
      const weight = 1 / (depth + 1);
      
      // Add to vector
      if (!vector[type]) {
        vector[type] = 0;
      }
      vector[type] += weight;
    }
    
    return vector;
  }
}
```

**Example:**
```typescript
// Input tokens
[
  "module:0",               // depth 0
  "function_definition:1",  // depth 1
  "function_definition:1",  // depth 1 (appears twice)
  "if_statement:2",         // depth 2
  "if_statement:2"          // depth 2 (appears twice)
]

// Output vector
{
  "module": 1.0,                    // 1/(0+1) = 1.0
  "function_definition": 1.0,       // 2 × (1/(1+1)) = 2 × 0.5 = 1.0
  "if_statement": 0.666             // 2 × (1/(2+1)) = 2 × 0.333 = 0.666
}
```

---

#### `src/services/SimilarityService.ts`
**Purpose:** Calculate cosine similarity between vectors  
**What It Does:**
- Compares two frequency vectors
- Uses cosine similarity formula
- Returns score 0.0-1.0 and confidence level
- Determines if flagged (> threshold)

**Algorithm:**
```typescript
Input:  Two frequency vectors
Output: Similarity score (0.0 to 1.0)

Formula:
similarity = (A · B) / (||A|| × ||B||)

Where:
- A · B = dot product = Σ(A[key] × B[key]) for common keys
- ||A|| = magnitude = sqrt(Σ(A[key]²))
- ||B|| = magnitude = sqrt(Σ(B[key]²))
```

**Step-by-Step Calculation:**
```typescript
Vector A = { func: 0.5, if: 0.3, for: 0.2 }
Vector B = { func: 0.5, if: 0.3, while: 0.2 }

Step 1: Calculate dot product (only common keys)
A · B = (0.5 × 0.5) + (0.3 × 0.3)
      = 0.25 + 0.09
      = 0.34

Step 2: Calculate magnitudes
||A|| = sqrt(0.5² + 0.3² + 0.2²)
      = sqrt(0.25 + 0.09 + 0.04)
      = sqrt(0.38)
      = 0.616

||B|| = sqrt(0.5² + 0.3² + 0.2²)
      = sqrt(0.38)
      = 0.616

Step 3: Calculate similarity
similarity = 0.34 / (0.616 × 0.616)
           = 0.34 / 0.38
           = 0.895  (89.5% similar)

Step 4: Determine confidence
if (similarity >= 0.90) confidence = "high"
else if (similarity >= 0.70) confidence = "medium"
else confidence = "low"

Step 5: Flag if > threshold
flagged = similarity >= 0.85  // true in this case
```

**Code:**
```typescript
class SimilarityService {
  cosineSimilarity(vectorA: FrequencyVector, vectorB: FrequencyVector): number {
    const commonKeys = Object.keys(vectorA).filter(key => key in vectorB);
    
    if (commonKeys.length === 0) {
      return 0.0; // No common structure
    }
    
    // Dot product
    let dotProduct = 0;
    for (const key of commonKeys) {
      dotProduct += vectorA[key] * vectorB[key];
    }
    
    // Magnitudes
    const magnitudeA = Math.sqrt(
      Object.values(vectorA).reduce((sum, val) => sum + val * val, 0)
    );
    const magnitudeB = Math.sqrt(
      Object.values(vectorB).reduce((sum, val) => sum + val * val, 0)
    );
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0.0;
    }
    
    // Cosine similarity
    return dotProduct / (magnitudeA * magnitudeB);
  }
  
  compare(vectorA: FrequencyVector, vectorB: FrequencyVector): SimilarityResult {
    const score = this.cosineSimilarity(vectorA, vectorB);
    
    return {
      similarityScore: score,
      confidence: this.getConfidence(score),
      flagged: score >= SIMILARITY_THRESHOLD, // 0.85
      sharedNodes: this.getSharedNodes(vectorA, vectorB)
    };
  }
  
  private getConfidence(score: number): string {
    if (score >= 0.90) return "high";
    if (score >= 0.70) return "medium";
    return "low";
  }
}
```

**Similarity Interpretation:**
```typescript
0.0 - 0.3:   Not similar (different code structure)
0.3 - 0.5:   Slightly similar (some common patterns)
0.5 - 0.7:   Somewhat similar (shared algorithms)
0.7 - 0.85:  Similar (related code)
0.85 - 0.95: Very similar (FLAG FOR REVIEW) 🚩
0.95 - 1.0:  Nearly identical (HIGH PLAGIARISM RISK) 🚨
```

---

#### `src/services/SubmissionService.ts`
**Purpose:** Standard submission CRUD operations  
**What It Does:**
- Save submissions to database
- Retrieve submissions by ID
- Get corpus (all submissions for language)
- Organization-scoped queries
- NO caching (basic implementation)

**Code:**
```typescript
class SubmissionService implements ISubmissionService {
  constructor(private repository: ISubmissionRepository) {}
  
  async saveSubmission(
    code: string,
    language: string,
    serializedAST: string[],
    vector: FrequencyVector,
    organizationId?: string
  ): Promise<string> {
    const submission = await this.repository.create({
      code,
      language,
      serializedAST,
      vector,
      organizationId,
      metadata: {
        lineCount: code.split('\n').length,
        nodeCount: serializedAST.length,
        depth: this.calculateDepth(serializedAST)
      }
    });
    
    return submission._id;
  }
  
  async getAllSerialized(language: string): Promise<CorpusEntry[]> {
    const submissions = await this.repository.findByLanguage(language);
    
    return submissions.map(sub => ({
      id: sub._id,
      serializedAST: sub.serializedAST,
      vector: sub.vector
    }));
  }
  
  async getAllSerializedForOrg(
    language: string,
    organizationId: string
  ): Promise<CorpusEntry[]> {
    const submissions = await this.repository.findByLanguageAndOrg(
      language,
      organizationId
    );
    
    return submissions.map(sub => ({
      id: sub._id,
      serializedAST: sub.serializedAST,
      vector: sub.vector
    }));
  }
}
```

---

#### `src/services/EnhancedSubmissionService.ts`
**Purpose:** Submission service with caching layer (Decorator Pattern)  
**What It Does:**
- Wraps base SubmissionService
- Adds LRU caching with TTL
- Caches corpus queries (expensive)
- Organization-specific cache keys
- Tracks cache hits/misses with MetricsService

**Decorator Pattern:**
```typescript
EnhancedSubmissionService wraps SubmissionService
- Adds caching behavior
- Delegates to base service on cache miss
- Same interface (ISubmissionService)
```

**Code:**
```typescript
class EnhancedSubmissionService implements ISubmissionService {
  constructor(
    private baseService: ISubmissionService,
    private cache: CacheService,
    private metrics: MetricsService
  ) {}
  
  async getAllSerialized(language: string): Promise<CorpusEntry[]> {
    const cacheKey = `corpus:${language}`;
    
    // Try cache first
    const cached = await this.cache.get<CorpusEntry[]>(cacheKey);
    if (cached) {
      this.metrics.recordCacheHit();
      return cached;
    }
    
    // Cache miss - fetch from database
    this.metrics.recordCacheMiss();
    const data = await this.baseService.getAllSerialized(language);
    
    // Store in cache (5 minute TTL)
    await this.cache.set(cacheKey, data, 300);
    
    return data;
  }
  
  async getAllSerializedForOrg(
    language: string,
    organizationId: string
  ): Promise<CorpusEntry[]> {
    const cacheKey = `corpus:${language}:${organizationId}`;
    
    const cached = await this.cache.get<CorpusEntry[]>(cacheKey);
    if (cached) {
      this.metrics.recordCacheHit();
      return cached;
    }
    
    this.metrics.recordCacheMiss();
    const data = await this.baseService.getAllSerializedForOrg(
      language,
      organizationId
    );
    
    await this.cache.set(cacheKey, data, 300);
    return data;
  }
  
  // saveSubmission delegates directly (no caching writes)
  async saveSubmission(...args): Promise<string> {
    return this.baseService.saveSubmission(...args);
  }
}
```

**Cache Keys:**
```typescript
Global corpus:  "corpus:python"
Org corpus:     "corpus:python:org123"
Analysis:       "analyze:codehash:python:org123"
Comparison:     "compare:hash1:hash2"
```

**Performance Impact:**
```
Without cache: 200ms (database query + serialization)
With cache:    2ms (memory lookup)
Improvement:   99% faster!
```

---

#### `src/services/OrganizationService.ts`
**Purpose:** Organization management and quota enforcement  
**What It Does:**
- CRUD operations for organizations
- API key generation (crypto.randomBytes)
- Usage tracking (increment counters)
- Limit enforcement (checkLimits)
- Monthly usage reset
- Usage statistics

**Key Methods:**

**1. findByApiKey (Authentication):**
```typescript
async findByApiKey(apiKey: string): Promise<IOrganization | null> {
  const org = await Organization.findOne({ apiKey });
  
  if (!org) return null;
  
  // Auto-reset usage if new month
  (org as any).resetUsageIfNeeded();
  await org.save();
  
  return org;
}
```

**2. create (Registration):**
```typescript
async create(data: CreateOrgDto): Promise<IOrganization> {
  // Generate secure API key
  const apiKey = `spd_${crypto.randomBytes(32).toString('hex')}`;
  
  // Get limits for plan
  const limits = PLAN_LIMITS[data.plan];
  
  const org = await Organization.create({
    name: data.name,
    email: data.email,
    plan: data.plan,
    apiKey,
    isActive: true,
    limits,
    usage: {
      submissionsThisMonth: 0,
      comparisonsThisMonth: 0,
      lastResetDate: new Date()
    }
  });
  
  return org;
}
```

**3. checkLimits (Quota Enforcement):**
```typescript
async checkLimits(
  org: IOrganization,
  type: 'submission' | 'comparison',
  count: number = 1
): Promise<void> {
  if (type === 'submission') {
    if ((org as any).hasExceededSubmissionLimit()) {
      throw new AppError(
        429,
        `Monthly submission limit exceeded (${org.limits.maxSubmissionsPerMonth}). ` +
        `Current usage: ${org.usage.submissionsThisMonth}`
      );
    }
  } else {
    const wouldExceed = 
      org.usage.comparisonsThisMonth + count > org.limits.maxComparisonsPerMonth;
    
    if (wouldExceed) {
      throw new AppError(
        429,
        `This operation requires ${count} comparisons, but you only have ` +
        `${org.limits.maxComparisonsPerMonth - org.usage.comparisonsThisMonth} remaining.`
      );
    }
  }
}
```

**4. updateUsage (Track Usage):**
```typescript
async updateUsage(
  orgId: string,
  type: 'submission' | 'comparison',
  count: number = 1
): Promise<void> {
  const org = await Organization.findById(orgId);
  if (!org) return;
  
  if (type === 'submission') {
    (org as any).incrementSubmissionUsage();
  } else {
    (org as any).incrementComparisonUsage(count);
  }
  
  await org.save();
}
```

**5. getUsageStats (Statistics):**
```typescript
async getUsageStats(orgId: string): Promise<UsageStats> {
  const org = await Organization.findById(orgId);
  if (!org) throw new AppError(404, "Organization not found");
  
  return {
    organization: {
      id: org._id,
      name: org.name,
      plan: org.plan
    },
    currentUsage: {
      submissions: org.usage.submissionsThisMonth,
      comparisons: org.usage.comparisonsThisMonth
    },
    limits: {
      submissions: org.limits.maxSubmissionsPerMonth,
      comparisons: org.limits.maxComparisonsPerMonth
    },
    percentageUsed: {
      submissions: (org.usage.submissionsThisMonth / org.limits.maxSubmissionsPerMonth) * 100,
      comparisons: (org.usage.comparisonsThisMonth / org.limits.maxComparisonsPerMonth) * 100
    },
    resetDate: org.usage.lastResetDate
  };
}
```

**Plan Limits Configuration:**
```typescript
const PLAN_LIMITS = {
  free: {
    maxSubmissionsPerMonth: 100,
    maxComparisonsPerMonth: 500,
    maxFileSizeBytes: 1 * 1024 * 1024,  // 1MB
    maxBulkFiles: 10
  },
  basic: {
    maxSubmissionsPerMonth: 1000,
    maxComparisonsPerMonth: 5000,
    maxFileSizeBytes: 5 * 1024 * 1024,  // 5MB
    maxBulkFiles: 25
  },
  pro: {
    maxSubmissionsPerMonth: 10000,
    maxComparisonsPerMonth: 50000,
    maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
    maxBulkFiles: 50
  },
  enterprise: {
    maxSubmissionsPerMonth: Infinity,
    maxComparisonsPerMonth: Infinity,
    maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
    maxBulkFiles: 100
  }
};
```

---

#### `src/services/CacheService.ts`
**Purpose:** In-memory LRU cache with TTL  
**What It Does:**
- Least Recently Used (LRU) eviction
- Time To Live (TTL) expiration
- Generic type support
- Memory-efficient

**LRU Cache Behavior:**
```
Max size: 100 items

Add items 1-100: All stored
Add item 101:    Item 1 evicted (least recently used)
Access item 5:   Item 5 marked as recently used
Add item 102:    Item 2 evicted (now least recently used, not 5!)
```

**Code:**
```typescript
class CacheService {
  private cache: LRUCache<string, any>;
  
  constructor() {
    this.cache = new LRUCache({
      max: 500,  // Maximum 500 items
      ttl: 1000 * 60 * 5,  // 5 minute TTL
      updateAgeOnGet: true  // Reset TTL on access
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get(key);
    return value !== undefined ? value : null;
  }
  
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : undefined;
    this.cache.set(key, value, { ttl });
  }
  
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
  
  async clear(): Promise<void> {
    this.cache.clear();
  }
}
```

---

#### `src/services/MetricsService.ts`
**Purpose:** Track performance metrics  
**What It Does:**
- Request counting (total, success, failed)
- Performance tracking (p50, p95, p99 latencies)
- Cache statistics (hit rate, miss rate)
- Circuit breaker states
- Exports for Prometheus

**Code:**
```typescript
class MetricsService {
  private requestCount = 0;
  private successCount = 0;
  private failureCount = 0;
  private durations: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  
  recordRequest(durationMs: number, success: boolean): void {
    this.requestCount++;
    this.durations.push(durationMs);
    
    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }
  }
  
  recordCacheHit(): void {
    this.cacheHits++;
  }
  
  recordCacheMiss(): void {
    this.cacheMisses++;
  }
  
  getMetrics(): Metrics {
    const sorted = [...this.durations].sort((a, b) => a - b);
    
    return {
      requests: {
        total: this.requestCount,
        successful: this.successCount,
        failed: this.failureCount
      },
      performance: {
        p50: this.percentile(sorted, 0.50),
        p95: this.percentile(sorted, 0.95),
        p99: this.percentile(sorted, 0.99)
      },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses)
      }
    };
  }
  
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }
}
```

---

#### `src/services/HealthCheckService.ts`
**Purpose:** System health monitoring  
**What It Does:**
- Database connectivity check
- Cache availability check
- Circuit breaker status
- Kubernetes liveness/readiness probes

**Code:**
```typescript
class HealthCheckService {
  async checkHealth(): Promise<HealthStatus> {
    const checks = {
      database: await this.checkDatabase(),
      cache: await this.checkCache(),
      circuitBreakers: this.checkCircuitBreakers()
    };
    
    const isHealthy = Object.values(checks).every(c => c.status === 'up');
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date(),
      uptime: process.uptime(),
      checks
    };
  }
  
  private async checkDatabase(): Promise<ComponentHealth> {
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - start;
      
      return {
        status: 'up',
        responseTime,
        message: 'Database connected'
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'Database connection failed'
      };
    }
  }
  
  async livenessProbe(): Promise<boolean> {
    // Liveness: Is the app running?
    return true;  // If this executes, app is alive
  }
  
  async readinessProbe(): Promise<boolean> {
    // Readiness: Is the app ready to serve traffic?
    const dbOk = (await this.checkDatabase()).status === 'up';
    return dbOk;
  }
}
```

---

### 📁 `src/controllers/` - HTTP Request Handlers

#### `src/controllers/SubmissionController.ts`
**Purpose:** Handle submission creation  
**What It Does:**
- Validates request body
- Checks organization quota
- Processes code through algorithm pipeline
- Saves submission to database
- Increments usage counter
- Returns submission ID

**Request Flow:**
```
1. Receive POST /api/v1/submissions
2. Extract: code, language, organization (from middleware)
3. Check submission quota (OrganizationService.checkLimits)
4. Parse code → AST (ParserService)
5. Normalize AST (NormalizerService)
6. Serialize AST (SerializerService)
7. Vectorize (VectorizerService)
8. Save submission (SubmissionService)
9. Increment usage counter
10. Return 201 Created with submission ID
```

**Code:**
```typescript
class SubmissionController {
  constructor(
    private submissions: ISubmissionService,
    private parser: IParserService,
    private normalizer: INormalizerService,
    private serializer: ISerializerService,
    private vectorizer: IVectorizerService,
    private organizationService: IOrganizationService
  ) {}
  
  create = asyncHandler(async (req: Request, res: Response) => {
    const { code, language } = req.body;
    const org = req.organization;  // Attached by auth middleware
    
    // 1. Check submission quota
    if (org) {
      await this.organizationService.checkLimits(org, 'submission');
    }
    
    // 2. Process code through pipeline
    const astRoot = this.parser.parse(code, language);
    const normalized = this.normalizer.normalize(astRoot);
    const serialized = this.serializer.serialize(normalized);
    const vector = this.vectorizer.vectorize(serialized);
    
    // 3. Save submission
    const submissionId = await this.submissions.saveSubmission(
      code,
      language,
      serialized,
      vector,
      org?._id
    );
    
    // 4. Increment usage
    if (org) {
      await this.organizationService.updateUsage(org._id, 'submission', 1);
    }
    
    // 5. Return response
    res.status(201).json({ submissionId });
  });
}
```

---

#### `src/controllers/AnalyzeController.ts`
**Purpose:** Analyze code against corpus  
**What It Does:**
- Compare new code against all stored submissions
- Organization-scoped corpus (only compare within org)
- Find highest similarity match
- Check comparison quota
- Track comparison usage

**Request Flow:**
```
1. Receive POST /api/v1/analyze
2. Check comparison quota
3. Process new code → vector
4. Fetch org's corpus (cached)
5. Compare against each corpus entry
6. Find highest similarity
7. Increment comparison usage (1)
8. Return similarity score + match details
```

**Code:**
```typescript
class AnalyzeController {
  constructor(
    private submissions: ISubmissionService,
    private parser: IParserService,
    private normalizer: INormalizerService,
    private serializer: ISerializerService,
    private similarity: ISimilarityService,
    private organizationService: IOrganizationService
  ) {}
  
  analyze = asyncHandler(async (req: Request, res: Response) => {
    const { code, language } = req.body;
    const org = req.organization;
    
    // 1. Check comparison quota
    if (org) {
      await this.organizationService.checkLimits(org, 'comparison', 1);
    }
    
    // 2. Process new code
    const astRoot = this.parser.parse(code, language);
    const normalized = this.normalizer.normalize(astRoot);
    const serialized = this.serializer.serialize(normalized);
    const vector = this.vectorizer.vectorize(serialized);
    
    // 3. Fetch corpus (organization-scoped)
    const corpus = org
      ? await this.submissions.getAllSerializedForOrg(language, org._id)
      : await this.submissions.getAllSerialized(language);
    
    if (corpus.length === 0) {
      return res.json({
        similarityScore: 0,
        confidence: "low",
        flagged: false,
        message: "No submissions in corpus yet"
      });
    }
    
    // 4. Compare against each corpus entry
    let highestScore = 0;
    let matchedSubmissionId = null;
    
    for (const entry of corpus) {
      const result = this.similarity.compare(vector, entry.vector);
      
      if (result.similarityScore > highestScore) {
        highestScore = result.similarityScore;
        matchedSubmissionId = entry.id;
      }
    }
    
    // 5. Increment usage
    if (org) {
      await this.organizationService.updateUsage(org._id, 'comparison', 1);
    }
    
    // 6. Return result
    res.json({
      similarityScore: highestScore,
      confidence: this.getConfidence(highestScore),
      matchedSubmissionId,
      flagged: highestScore >= SIMILARITY_THRESHOLD,
      corpusSize: corpus.length
    });
  });
}
```

---

#### `src/controllers/CompareController.ts`
**Purpose:** Direct comparison and bulk analysis  
**What It Does:**
- Compare two specific code snippets
- Bulk compare N files (pairwise)
- Pre-validate bulk quota (n*(n-1)/2 comparisons)
- Track usage accurately

**Single Comparison:**
```typescript
compare = asyncHandler(async (req: Request, res: Response) => {
  const { code1, code2, language } = req.body;
  const org = req.organization;
  
  // 1. Check quota (1 comparison)
  if (org) {
    await this.organizationService.checkLimits(org, 'comparison', 1);
  }
  
  // 2. Process both codes
  const vector1 = this.processCode(code1, language);
  const vector2 = this.processCode(code2, language);
  
  // 3. Compare
  const result = this.similarity.compare(vector1, vector2);
  
  // 4. Track usage
  if (org) {
    await this.organizationService.updateUsage(org._id, 'comparison', 1);
  }
  
  res.json(result);
});
```

**Bulk Comparison (THE FEATURE YOU ASKED ABOUT):**
```typescript
bulkAnalyze = asyncHandler(async (req: Request, res: Response) => {
  const { submissions, language } = req.body;
  const org = req.organization;
  
  const n = submissions.length;
  const pairCount = (n * (n - 1)) / 2;  // Formula for pairs
  
  // 1. Pre-validate quota (critical!)
  if (org) {
    await this.organizationService.checkLimits(org, 'comparison', pairCount);
  }
  
  // 2. Process all submissions
  const vectors = submissions.map(sub => ({
    label: sub.label,
    code: sub.code,
    vector: this.processCode(sub.code, language)
  }));
  
  // 3. Compare every pair
  const results: ComparisonResult[] = [];
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const result = this.similarity.compare(
        vectors[i].vector,
        vectors[j].vector
      );
      
      results.push({
        pair: [vectors[i].label, vectors[j].label],
        similarityScore: result.similarityScore,
        confidence: result.confidence,
        flagged: result.flagged
      });
    }
  }
  
  // 4. Track usage (all comparisons)
  if (org) {
    await this.organizationService.updateUsage(org._id, 'comparison', pairCount);
  }
  
  // 5. Return comprehensive results
  res.json({
    results,
    summary: {
      totalPairs: pairCount,
      flaggedPairs: results.filter(r => r.flagged).length,
      averageSimilarity: results.reduce((sum, r) => sum + r.similarityScore, 0) / pairCount
    }
  });
});
```

**Bulk Comparison Examples:**

**3 Students:**
```
Students: A, B, C
Pairs: A-B, A-C, B-C
Count: 3 × 2 / 2 = 3 comparisons
```

**5 Students:**
```
Students: A, B, C, D, E
Pairs: A-B, A-C, A-D, A-E, B-C, B-D, B-E, C-D, C-E, D-E
Count: 5 × 4 / 2 = 10 comparisons
```

**10 Students:**
```
Count: 10 × 9 / 2 = 45 comparisons
```

**25 Students (typical class):**
```
Count: 25 × 24 / 2 = 300 comparisons
```

---

#### `src/controllers/OrganizationController.ts`
**Purpose:** Organization management endpoints  
**What It Does:**
- Registration (POST /organizations)
- Get current org details (GET /me)
- Get usage statistics (GET /usage)

**Code:**
```typescript
class OrganizationController {
  constructor(private organizationService: IOrganizationService) {}
  
  // POST /api/v1/organizations (public, no auth)
  create = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, plan } = req.body;
    
    const org = await this.organizationService.create({ name, email, plan });
    
    res.status(201).json({
      organization: {
        id: org._id,
        name: org.name,
        email: org.email,
        plan: org.plan,
        apiKey: org.apiKey,  // Only shown once!
        limits: org.limits
      },
      message: "Organization created successfully. Keep your API key secure!"
    });
  });
  
  // GET /api/v1/organizations/me (requires auth)
  getCurrent = asyncHandler(async (req: Request, res: Response) => {
    const org = req.organization;  // From middleware
    
    res.json({
      organization: {
        id: org._id,
        name: org.name,
        email: org.email,
        plan: org.plan,
        isActive: org.isActive,
        limits: org.limits,
        createdAt: org.createdAt
      }
    });
  });
  
  // GET /api/v1/organizations/usage (requires auth)
  getUsage = asyncHandler(async (req: Request, res: Response) => {
    const org = req.organization;
    const stats = await this.organizationService.getUsageStats(org._id);
    
    res.json({ usage: stats });
  });
}
```

---

#### `src/controllers/MonitoringController.ts`
**Purpose:** Health checks and metrics  
**What It Does:**
- /health - Detailed health status
- /health/liveness - Kubernetes liveness probe
- /health/readiness - Kubernetes readiness probe
- /metrics - JSON metrics
- /metrics/prometheus - Prometheus format

---

### 📁 `src/middlewares/` - Request Processing Pipeline

#### `src/middlewares/authMiddleware.ts`
**Purpose:** Authenticate requests and attach organization  
**What It Does:**
- Extract API key from x-api-key header
- Lookup organization in database
- Auto-reset monthly usage if needed
- Validate organization is active
- Attach organization to req.organization
- Reject if invalid/inactive (401/403)

**Factory Pattern:**
```typescript
export const createAuthMiddleware = (orgService: IOrganizationService) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: "API key required" });
    }
    
    // Lookup organization
    const organization = await orgService.findByApiKey(apiKey);
    
    if (!organization) {
      return res.status(401).json({ error: "Invalid API key" });
    }
    
    if (!organization.isActive) {
      return res.status(403).json({ error: "Organization account is inactive" });
    }
    
    // Attach to request
    req.organization = organization;
    next();
  };
};
```

**Usage in Routes:**
```typescript
// Protected routes use auth middleware
router.post('/submissions', authMiddleware, submissionController.create);
router.post('/analyze', authMiddleware, analyzeController.analyze);
router.post('/compare', authMiddleware, compareController.compare);
```

---

#### `src/middlewares/rateLimiter.ts`
**Purpose:** Prevent API abuse  
**What It Does:**
- Limits requests per IP address
- Default: 100 requests per 15 minutes
- Returns 429 Too Many Requests when exceeded

**Code:**
```typescript
import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                  // 100 requests
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,     // Return rate limit info in headers
  legacyHeaders: false
});
```

---

#### `src/middlewares/errorHandler.ts`
**Purpose:** Centralized error handling  
**What It Does:**
- Catches all errors from controllers/services
- Differentiates operational vs programming errors
- Formats consistent error responses
- Logs errors with context
- Hides sensitive info in production

**Code:**
```typescript
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  if (err instanceof AppError) {
    // Operational error (expected)
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode
    });
  }
  
  // Programming error (unexpected)
  return res.status(500).json({
    error: "Internal server error",
    ...(process.env.NODE_ENV === 'development' && { 
      details: err.message,
      stack: err.stack
    })
  });
};
```

---

#### `src/middlewares/metricsMiddleware.ts`
**Purpose:** Track request performance  
**What It Does:**
- Measures request duration
- Records success/failure
- Sends to MetricsService

**Code:**
```typescript
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const success = res.statusCode < 400;
    
    metricsService.recordRequest(duration, success);
  });
  
  next();
};
```

---

#### `src/middlewares/correlationMiddleware.ts`
**Purpose:** Request tracing with correlation IDs  
**What It Does:**
- Generates unique ID for each request
- Attaches to req.correlationId
- All logs for request use same ID
- Easy to trace request flow

**Code:**
```typescript
import { v4 as uuidv4 } from 'uuid';

export const correlationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.correlationId = uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
};
```

---

#### `src/middlewares/securityMiddleware.ts`
**Purpose:** Security headers with Helmet  
**What It Does:**
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (prevent clickjacking)
- X-Content-Type-Options (prevent MIME sniffing)

**Code:**
```typescript
import helmet from 'helmet';

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});
```

---

### 📁 `src/routes/` - Route Definitions

#### `src/routes/submission.routes.ts`
**Purpose:** Submission endpoints  
**Routes:**
- POST / - Create submission
- GET /:id - Get submission by ID

**Code:**
```typescript
export const createSubmissionRouter = (controller: SubmissionController) => {
  const router = express.Router();
  
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  
  return router;
};
```

---

#### `src/routes/analyze.routes.ts`
**Purpose:** Analysis endpoint  
**Routes:**
- POST / - Analyze code against corpus

---

#### `src/routes/compare.routes.ts`
**Purpose:** Comparison endpoints  
**Routes:**
- POST / - Compare two code snippets
- POST /bulk - Bulk compare multiple files (YOUR FEATURE!)

---

#### `src/routes/organization.routes.ts`
**Purpose:** Organization endpoints  
**Routes:**
- POST / - Register organization (public)
- GET /me - Get current org (requires auth)
- GET /usage - Get usage stats (requires auth)

---

### 📁 `src/utils/` - Utility Functions

#### `src/utils/AppError.ts`
**Purpose:** Custom error class  
**What It Does:**
- Operational errors (expected)
- HTTP status code attached
- Distinguishes from programming errors

**Code:**
```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Usage
throw new AppError(404, "Submission not found");
throw new AppError(429, "Monthly limit exceeded");
```

---

#### `src/utils/asyncHandler.ts`
**Purpose:** Wrap async controllers  
**What It Does:**
- Catches async errors automatically
- Passes to error handler middleware
- Avoids try-catch in every controller

**Code:**
```typescript
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage
router.post('/', asyncHandler(async (req, res) => {
  // If this throws, asyncHandler catches and passes to errorHandler
  const result = await someAsyncOperation();
  res.json(result);
}));
```

---

#### `src/utils/CircuitBreaker.ts`
**Purpose:** Prevent cascading failures  
**What It Does:**
- Tracks success/failure of operations
- Opens circuit after threshold failures
- Rejects requests while open (fast fail)
- Attempts recovery after timeout

**States:**
```
CLOSED (normal)
   ↓ (5 failures)
OPEN (reject all)
   ↓ (60 seconds)
HALF_OPEN (test 1 request)
   ↓ (success)
CLOSED (recovered)
```

---

#### `src/utils/ShutdownHandler.ts`
**Purpose:** Graceful shutdown  
**What It Does:**
- Stop accepting new requests
- Wait for in-flight requests (max 30s)
- Close database connections
- Flush logs
- Exit cleanly

---

#### `src/utils/logger.ts`
**Purpose:** Structured logging with Winston  
**What It Does:**
- JSON logs for production
- Pretty logs for development
- Log levels (error, warn, info, debug)
- File rotation

---

#### `src/utils/constants.ts`
**Purpose:** Centralized constants  
**What It Does:**
- SIMILARITY_THRESHOLD = 0.85
- Other configuration constants

---

## Data Flow Examples

### Example 1: Create Submission

```
User → API
│
├─ POST /api/v1/submissions
│  Headers: x-api-key: spd_abc123
│  Body: { code: "def factorial(n): ...", language: "python" }
│
└─> Middleware Pipeline
    │
    ├─ securityMiddleware (add security headers)
    ├─ correlationMiddleware (generate request ID)
    ├─ metricsMiddleware (start timer)
    ├─ authMiddleware (lookup organization)
    │   └─> OrganizationService.findByApiKey("spd_abc123")
    │       └─> MongoDB: organizations.findOne({ apiKey: "spd_abc123" })
    │           └─> Attach req.organization
    │
    └─> SubmissionController.create
        │
        ├─ 1. Check quota
        │   └─> OrganizationService.checkLimits(org, "submission")
        │       └─> If exceeded: throw 429 error
        │
        ├─ 2. Parse code
        │   └─> ParserService.parse(code, "python")
        │       └─> Tree-sitter parses → AST
        │
        ├─ 3. Normalize AST
        │   └─> NormalizerService.normalize(ast)
        │       └─> Strip names/values → structure only
        │
        ├─ 4. Serialize AST
        │   └─> SerializerService.serialize(normalized)
        │       └─> DFS traversal → ["module:0", "function:1", ...]
        │
        ├─ 5. Vectorize
        │   └─> VectorizerService.vectorize(tokens)
        │       └─> Depth-weighted frequency → { module: 1.0, ... }
        │
        ├─ 6. Save submission
        │   └─> SubmissionService.saveSubmission(code, lang, tokens, vector, orgId)
        │       └─> SubmissionRepository.create(submission)
        │           └─> MongoDB: submissions.insertOne({ ... })
        │               └─> Returns submission ID
        │
        ├─ 7. Track usage
        │   └─> OrganizationService.updateUsage(orgId, "submission", 1)
        │       └─> MongoDB: organizations.updateOne({ _id: orgId }, { $inc: { "usage.submissionsThisMonth": 1 } })
        │
        └─> Response
            └─ 201 Created
               { submissionId: "abc123" }
```

---

### Example 2: Analyze Code (Find Plagiarism)

```
User → API
│
├─ POST /api/v1/analyze
│  Headers: x-api-key: spd_xyz
│  Body: { code: "def fact(n): ...", language: "python" }
│
└─> Middleware → Auth → Controller
    │
    └─> AnalyzeController.analyze
        │
        ├─ 1. Check quota
        │   └─> OrganizationService.checkLimits(org, "comparison", 1)
        │
        ├─ 2. Process new code
        │   └─> Parse → Normalize → Serialize → Vectorize
        │       └─> newVector = { module: 1.0, function: 0.5, ... }
        │
        ├─ 3. Fetch corpus (cached)
        │   └─> EnhancedSubmissionService.getAllSerializedForOrg("python", orgId)
        │       │
        │       ├─ Check cache: "corpus:python:org123"
        │       │   └─> Cache HIT (2ms) → return cached data
        │       │   └─> Cache MISS (200ms) → fetch from DB
        │       │
        │       └─> Returns: [
        │             { id: "sub1", vector: {...} },
        │             { id: "sub2", vector: {...} },
        │             { id: "sub3", vector: {...} }
        │           ]
        │
        ├─ 4. Compare against each
        │   │
        │   ├─ Compare newVector vs corpus[0].vector
        │   │   └─> SimilarityService.compare(newVector, corpus[0].vector)
        │   │       └─> Cosine similarity = 0.65 (not flagged)
        │   │
        │   ├─ Compare newVector vs corpus[1].vector
        │   │   └─> Cosine similarity = 0.98 (FLAGGED!) 🚩
        │   │
        │   └─ Compare newVector vs corpus[2].vector
        │       └─> Cosine similarity = 0.45 (not flagged)
        │
        ├─ 5. Find highest similarity
        │   └─> highestScore = 0.98
        │       matchedId = corpus[1].id
        │
        ├─ 6. Track usage
        │   └─> OrganizationService.updateUsage(orgId, "comparison", 1)
        │
        └─> Response
            └─ 200 OK
               {
                 similarityScore: 0.98,
                 confidence: "high",
                 matchedSubmissionId: "sub2",
                 flagged: true,
                 corpusSize: 3
               }
```

---

### Example 3: Bulk Compare (25 Students)

```
User → API
│
├─ POST /api/v1/compare/bulk
│  Headers: x-api-key: spd_university
│  Body: {
│    submissions: [
│      { code: "...", label: "student_1" },
│      { code: "...", label: "student_2" },
│      ... (25 total)
│    ],
│    language: "python"
│  }
│
└─> Middleware → Auth → Controller
    │
    └─> CompareController.bulkAnalyze
        │
        ├─ 1. Calculate comparison count
        │   └─> n = 25
        │       pairCount = 25 × 24 / 2 = 300 comparisons
        │
        ├─ 2. Pre-validate quota (IMPORTANT!)
        │   └─> OrganizationService.checkLimits(org, "comparison", 300)
        │       │
        │       └─> If org has only 100 comparisons left:
        │           throw new AppError(429,
        │             "This operation requires 300 comparisons, " +
        │             "but you only have 100 remaining."
        │           )
        │
        ├─ 3. Process all submissions
        │   │
        │   └─> For each submission:
        │       Parse → Normalize → Serialize → Vectorize
        │       
        │       Results: [
        │         { label: "student_1", vector: {...} },
        │         { label: "student_2", vector: {...} },
        │         ... (25 total)
        │       ]
        │
        ├─ 4. Compare every pair (nested loop)
        │   │
        │   ├─ for i = 0 to 24:
        │   │   for j = i+1 to 24:
        │   │     compare(vector[i], vector[j])
        │   │
        │   └─> Comparisons:
        │       │
        │       ├─ student_1 vs student_2: 0.45 (not flagged)
        │       ├─ student_1 vs student_3: 0.99 (FLAGGED!) 🚨
        │       ├─ student_1 vs student_4: 0.50
        │       ├─ ...
        │       ├─ student_2 vs student_3: 0.98 (FLAGGED!) 🚨
        │       └─ ... (300 total pairs)
        │
        ├─ 5. Track usage
        │   └─> OrganizationService.updateUsage(orgId, "comparison", 300)
        │       └─> MongoDB: increment comparisonsThisMonth by 300
        │
        └─> Response
            └─ 200 OK
               {
                 results: [
                   {
                     pair: ["student_1", "student_2"],
                     similarityScore: 0.45,
                     confidence: "low",
                     flagged: false
                   },
                   {
                     pair: ["student_1", "student_3"],
                     similarityScore: 0.99,
                     confidence: "high",
                     flagged: true  // ← SUSPICIOUS!
                   },
                   {
                     pair: ["student_2", "student_3"],
                     similarityScore: 0.98,
                     confidence: "high",
                     flagged: true  // ← SUSPICIOUS!
                   },
                   ... (300 total pairs)
                 ],
                 summary: {
                   totalPairs: 300,
                   flaggedPairs: 12,
                   averageSimilarity: 0.52
                 }
               }
               
               // Interpretation:
               // - 12 pairs are suspicious (>85% similar)
               // - student_1 & student_3 have 99% similarity → likely plagiarism
               // - student_2 & student_3 have 98% similarity → likely plagiarism
               // - Cluster: student_1, student_2, student_3 copied from each other
```

---

## Feature Deep Dives

### 🎯 Bulk Submission Feature (Detailed)

**Use Case:** Teacher has 50 student assignments, wants to check all for plagiarism

**Workflow:**

**Step 1: Collect all student code files**
```bash
assignments/
├── student_alice.py
├── student_bob.py
├── student_charlie.py
├── ... (50 files total)
```

**Step 2: Format request**
```json
{
  "submissions": [
    {
      "code": "def factorial(n):\n    return 1 if n == 0 else n * factorial(n-1)",
      "label": "alice"
    },
    {
      "code": "def fact(x):\n    return 1 if x == 0 else x * fact(x-1)",
      "label": "bob"
    },
    {
      "code": "def compute(num):\n    return 1 if num == 0 else num * compute(num-1)",
      "label": "charlie"
    }
    // ... 47 more
  ],
  "language": "python"
}
```

**Step 3: Send request**
```bash
curl -X POST http://localhost:3000/api/v1/compare/bulk \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d @assignments.json
```

**Step 4: System processes**
```
1. Validate quota: 50 students = 1,225 comparisons
   - Check: org.usage.comparisonsThisMonth + 1225 <= org.limits.maxComparisonsPerMonth
   - If exceeded: return 429 error BEFORE processing
   
2. Process each submission:
   - Parse → AST
   - Normalize → structure only
   - Serialize → token array
   - Vectorize → frequency vector
   Time: ~50ms × 50 = 2.5 seconds

3. Compare every pair:
   - alice vs bob
   - alice vs charlie
   - alice vs dave
   - ... (1,225 total)
   Time: ~2ms × 1,225 = 2.5 seconds
   
4. Total time: ~5 seconds (with cache optimization)

5. Track usage: increment comparisonsThisMonth by 1,225
```

**Step 5: Analyze results**
```json
{
  "results": [
    {
      "pair": ["alice", "bob"],
      "similarityScore": 0.98,
      "flagged": true
    },
    {
      "pair": ["alice", "charlie"],
      "similarityScore": 0.97,
      "flagged": true
    },
    {
      "pair": ["bob", "charlie"],
      "similarityScore": 0.99,
      "flagged": true
    },
    {
      "pair": ["alice", "dave"],
      "similarityScore": 0.35,
      "flagged": false
    },
    // ... 1,221 more pairs
  ],
  "summary": {
    "totalPairs": 1225,
    "flaggedPairs": 3,
    "averageSimilarity": 0.42
  }
}
```

**Step 6: Identify clusters**
```
Flagged pairs:
- alice ↔ bob (98%)
- alice ↔ charlie (97%)
- bob ↔ charlie (99%)

Cluster identified: alice, bob, charlie
Likely: Copied from each other or same source

Action: Manual review needed for these 3 students
```

---

### 🔍 Algorithm Pipeline (Visual)

```
┌─────────────────────────────────────────────────┐
│  ORIGINAL CODE                                  │
│  def factorial(n):                              │
│      return 1 if n == 0 else n * factorial(n-1)│
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  STEP 1: PARSE (Tree-sitter)                    │
│  Input:  String                                 │
│  Output: Abstract Syntax Tree                   │
│                                                 │
│  module                                         │
│  └── function_definition                        │
│      ├── name: "factorial"                      │
│      ├── parameters                             │
│      │   └── identifier: "n"                    │
│      └── return_statement                       │
│          └── conditional_expression             │
│              ├── condition: n == 0              │
│              ├── if_true: 1                     │
│              └── if_false: n * factorial(n-1)   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  STEP 2: NORMALIZE                              │
│  Input:  Full AST with names/values             │
│  Output: Structure-only AST                     │
│                                                 │
│  Remove:                                        │
│  ✂️ "factorial" (name)                          │
│  ✂️ "n" (variable)                              │
│  ✂️ 0, 1 (numbers)                              │
│                                                 │
│  Keep:                                          │
│  ✅ module                                      │
│  ✅ function_definition                         │
│  ✅ return_statement                            │
│  ✅ conditional_expression                      │
│  ✅ binary_operator                             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  STEP 3: SERIALIZE (Pre-order DFS)              │
│  Input:  Tree structure                         │
│  Output: Flat array of "type:depth" tokens      │
│                                                 │
│  [                                              │
│    "module:0",                                  │
│    "function_definition:1",                     │
│    "parameters:2",                              │
│    "return_statement:2",                        │
│    "conditional_expression:3",                  │
│    "comparison_operator:4",                     │
│    "number:5",                                  │
│    "binary_operator:4",                         │
│    ...                                          │
│  ]                                              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  STEP 4: VECTORIZE (Depth-weighted frequency)   │
│  Input:  Token array                            │
│  Output: Frequency vector                       │
│                                                 │
│  For each token "type:depth":                   │
│    weight = 1 / (depth + 1)                     │
│    vector[type] += weight                       │
│                                                 │
│  Result:                                        │
│  {                                              │
│    "module": 1.0,                (depth 0)      │
│    "function_definition": 0.5,   (depth 1)      │
│    "return_statement": 0.5,      (depth 1)      │
│    "conditional_expression": 0.333, (depth 2)   │
│    "comparison_operator": 0.25,  (depth 3)      │
│    "binary_operator": 0.25,      (depth 3)      │
│    ...                                          │
│  }                                              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  STEP 5: COMPARE (Cosine Similarity)            │
│  Input:  Two vectors                            │
│  Output: Similarity score (0.0 - 1.0)           │
│                                                 │
│  Vector A (original code)                       │
│  Vector B (suspected plagiarism)                │
│                                                 │
│  similarity = (A · B) / (||A|| × ||B||)         │
│             = 0.98                              │
│                                                 │
│  Result:                                        │
│  {                                              │
│    similarityScore: 0.98,                       │
│    confidence: "high",                          │
│    flagged: true (>= 0.85 threshold)            │
│  }                                              │
└─────────────────────────────────────────────────┘
```

---

## How Everything Connects

### Dependency Graph

```
server.ts (entry point)
  │
  ├─> app.ts (Express app)
  │     │
  │     ├─> Middleware Stack
  │     │     ├─> securityMiddleware
  │     │     ├─> correlationMiddleware
  │     │     ├─> metricsMiddleware
  │     │     └─> errorHandler
  │     │
  │     └─> Routes
  │           ├─> submissionRouter
  │           ├─> analyzeRouter
  │           ├─> compareRouter
  │           ├─> organizationRouter
  │           └─> monitoringRouter
  │
  └─> container.ts (DI Container)
        │
        ├─> Controllers
        │     ├─> SubmissionController
        │     ├─> AnalyzeController
        │     ├─> CompareController
        │     └─> OrganizationController
        │
        ├─> Services
        │     ├─> ParserService
        │     ├─> NormalizerService
        │     ├─> SerializerService
        │     ├─> VectorizerService
        │     ├─> SimilarityService
        │     ├─> OrganizationService
        │     ├─> EnhancedSubmissionService
        │     │     └─> wraps SubmissionService
        │     ├─> CacheService
        │     ├─> MetricsService
        │     └─> HealthCheckService
        │
        ├─> Repositories
        │     ├─> MongoSubmissionRepository
        │     └─> InMemorySubmissionRepository
        │
        └─> Models
              ├─> Organization (Mongoose)
              └─> Submission (Mongoose)
```

### Request Flow (Complete)

```
1. Client sends HTTP request
   ↓
2. Express receives on port 3000
   ↓
3. Middleware Pipeline (IN ORDER):
   a. helmet() - add security headers
   b. cors() - handle cross-origin
   c. express.json() - parse JSON body
   d. correlationMiddleware - add request ID
   e. metricsMiddleware - start timer
   ↓
4. Route matching
   ↓
5. authMiddleware (if protected route)
   - Extract API key
   - Lookup organization
   - Attach to req.organization
   ↓
6. Controller method
   - Validate request
   - Check quotas
   - Call services
   ↓
7. Service layer
   - Business logic
   - Algorithm execution
   - Database operations
   ↓
8. Repository layer
   - Abstract database
   - MongoDB or in-memory
   ↓
9. Database
   - Store/retrieve data
   ↓
10. Response flows back up
   ↓
11. metricsMiddleware records duration
   ↓
12. errorHandler catches errors (if any)
   ↓
13. Response sent to client
```

---

## Performance Characteristics

### Response Times

| Operation | Without Cache | With Cache (70% hit) |
|-----------|---------------|----------------------|
| Parse code | 30-50ms | 30-50ms (not cached) |
| Fetch corpus (100 items) | 150-200ms | 2-5ms |
| Compare two vectors | 1-2ms | 1-2ms (not cached) |
| Single analysis | 200-250ms | 50-80ms |
| Bulk 10 files (45 pairs) | 500ms | 200ms |
| Bulk 25 files (300 pairs) | 8s | 2.5s |

### Scalability

**Vertical (Single Server):**
- Max: ~100 requests/second
- CPU-bound: AST parsing
- Memory: ~500MB for 10K submissions cached

**Horizontal (Multiple Servers):**
- Stateless design allows infinite scaling
- Shared MongoDB + Redis cache
- Load balancer distributes requests

**Database:**
- Indexes on apiKey, organizationId
- Query time: <10ms with indexes
- Can handle millions of submissions

---

## Summary

### Key Takeaways

1. **YES, Bulk Submissions Supported!**
   - `POST /api/v1/compare/bulk`
   - Compares N files pairwise (N×(N-1)/2 comparisons)
   - Pre-validates quota before processing

2. **Layered Architecture**
   - Controllers → Services → Repositories → Database
   - Clean separation of concerns
   - Easy to test and maintain

3. **Algorithm Pipeline**
   - Parse → Normalize → Serialize → Vectorize → Compare
   - Each step has dedicated service
   - Rename-immune structural analysis

4. **Multi-Tenancy**
   - Organization-based isolation
   - Plan-based usage limits
   - Automatic monthly reset

5. **Production-Ready**
   - Caching (70-90% hit rate)
   - Circuit breakers
   - Monitoring & metrics
   - Health checks
   - Security headers

### File Count

- **Total Files: ~45**
- Configuration: 5 files
- Source Code: ~40 files
  - Models: 2
  - Repositories: 1
  - Services: 10
  - Controllers: 5
  - Middlewares: 7
  - Routes: 5
  - Utils: 5
  - Config: 2
  - Adapters: 1
  - Server: 2

### Lines of Code: ~8,000

- Services: ~3,000 lines
- Controllers: ~1,500 lines
- Models: ~400 lines
- Repositories: ~500 lines
- Middlewares: ~600 lines
- Utils: ~800 lines
- Routes: ~400 lines
- Config: ~300 lines
- Other: ~500 lines

---

**This document explains EVERY file and feature in your project! Bookmark it for reference! 📚**
