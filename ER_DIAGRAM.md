# Entity Relationship Diagram

Database schema for the Structural Plagiarism Detector showing multi-tenant architecture.

## ER Diagram

```mermaid
erDiagram
    ORGANIZATION ||--o{ SUBMISSION : owns
    
    ORGANIZATION {
        ObjectId _id PK
        string name
        string email UK
        string apiKey UK "Indexed, spd_ prefix"
        enum plan "free|basic|pro|enterprise"
        boolean isActive
        object limits
        object usage
        object metadata
        datetime createdAt
        datetime updatedAt
    }
    
    SUBMISSION {
        ObjectId _id PK
        ObjectId organizationId FK "Nullable, Indexed"
        string code
        enum language "python|javascript"
        array serializedAST "Token sequence"
        object vector "Frequency vector"
        object metadata
        datetime createdAt
        datetime updatedAt
    }
    
    ORGANIZATION ||--|| LIMITS : has
    ORGANIZATION ||--|| USAGE : tracks
    
    LIMITS {
        number maxSubmissionsPerMonth
        number maxComparisonsPerMonth
        number maxFileSizeBytes
        number maxBulkFiles
    }
    
    USAGE {
        number submissionsThisMonth
        number comparisonsThisMonth
        datetime lastResetDate
    }
    
    SUBMISSION ||--|| VECTOR : contains
    SUBMISSION ||--|| METADATA : has
    
    VECTOR {
        float module
        float function_definition
        float class_definition
        float if_statement
        float for_statement
        float while_statement
    }
    
    METADATA {
        number lineCount
        number nodeCount
        number depth
        number size
    }
```

---

## Detailed Schema

### Organization Collection

**Purpose:** Multi-tenant organization management with plan-based usage limits

**Indexes:**
- `{ apiKey: 1 }` - Unique index for authentication
- `{ email: 1 }` - Unique index for registration validation

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `name` | String | Organization name (e.g., "Stanford University") |
| `email` | String | Contact email (unique) |
| `apiKey` | String | Authentication key (`spd_[64-char-hex]`) |
| `plan` | Enum | Subscription tier (free, basic, pro, enterprise) |
| `isActive` | Boolean | Account status (false = suspended) |
| `limits` | Object | Plan-based resource limits |
| `limits.maxSubmissionsPerMonth` | Number | Monthly submission quota |
| `limits.maxComparisonsPerMonth` | Number | Monthly comparison quota |
| `limits.maxFileSizeBytes` | Number | Max file size allowed |
| `limits.maxBulkFiles` | Number | Max files in bulk comparison |
| `usage` | Object | Current month's usage tracking |
| `usage.submissionsThisMonth` | Number | Submissions used this month |
| `usage.comparisonsThisMonth` | Number | Comparisons used this month |
| `usage.lastResetDate` | Date | Last monthly reset timestamp |
| `metadata` | Object | Additional organization data |
| `createdAt` | Date | Account creation timestamp |
| `updatedAt` | Date | Last modification timestamp |

**Instance Methods:**
```typescript
hasExceededSubmissionLimit(): boolean
hasExceededComparisonLimit(): boolean
resetUsageIfNeeded(): void
incrementSubmissionUsage(): void
incrementComparisonUsage(count: number): void
```

---

### Submission Collection

**Purpose:** Store code submissions with AST representations for plagiarism detection

**Indexes:**
- `{ organizationId: 1, language: 1 }` - Compound index for org-scoped queries
- `{ createdAt: 1 }` - Time-based queries

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `organizationId` | ObjectId | Foreign key to Organization (nullable) |
| `code` | String | Original source code |
| `language` | Enum | Programming language (python, javascript) |
| `serializedAST` | String[] | Token sequence from AST ("type:depth") |
| `vector` | Object | Depth-weighted frequency vector |
| `vector[nodeType]` | Number | Frequency of each AST node type |
| `metadata` | Object | Code statistics |
| `metadata.lineCount` | Number | Number of lines in code |
| `metadata.nodeCount` | Number | Total AST nodes |
| `metadata.depth` | Number | Maximum AST depth |
| `metadata.size` | Number | Code size in bytes |
| `createdAt` | Date | Submission timestamp |
| `updatedAt` | Date | Last modification timestamp |

---

## Relationships

### One-to-Many: Organization → Submissions
- **Cardinality:** 1:N (One organization has many submissions)
- **Foreign Key:** `Submission.organizationId` references `Organization._id`
- **Optional:** `organizationId` is nullable for backward compatibility
- **Cascade:** No automatic deletion (orphaned submissions retained for auditing)

**Query Examples:**
```javascript
// Get all submissions for an organization
db.submissions.find({ organizationId: orgId, language: "python" })

// Count submissions by organization
db.submissions.aggregate([
  { $group: { _id: "$organizationId", count: { $sum: 1 } } }
])
```

---

## Plan Limits Configuration

```mermaid
flowchart LR
    ORG[Organization]
    FREE[Free Plan]
    BASIC[Basic Plan]
    PRO[Pro Plan]
    ENTERPRISE[Enterprise Plan]
    
    ORG --> FREE
    ORG --> BASIC
    ORG --> PRO
    ORG --> ENTERPRISE
    
    FREE --> |100 sub/mo| LIMITS1[500 comp/mo]
    BASIC --> |1K sub/mo| LIMITS2[5K comp/mo]
    PRO --> |10K sub/mo| LIMITS3[50K comp/mo]
    ENTERPRISE --> |Unlimited| LIMITS4[Unlimited]
```

### Plan Limits Matrix

| Plan | Submissions | Comparisons | File Size | Bulk Files | Price |
|------|-------------|-------------|-----------|------------|-------|
| **Free** | 100/month | 500/month | 1 MB | 10 | $0 |
| **Basic** | 1,000/month | 5,000/month | 5 MB | 25 | $99/mo |
| **Pro** | 10,000/month | 50,000/month | 10 MB | 50 | $499/mo |
| **Enterprise** | Unlimited | Unlimited | 50 MB | 100 | Custom |

---

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth
    participant OrgService
    participant SubService
    participant MongoDB
    
    Client->>API: POST /api/v1/submissions
    API->>Auth: Validate x-api-key
    Auth->>OrgService: findByApiKey()
    OrgService->>MongoDB: Query organizations
    MongoDB-->>OrgService: Organization document
    OrgService-->>Auth: Organization + reset usage
    Auth-->>API: req.organization attached
    
    API->>OrgService: checkLimits(org, "submission")
    OrgService-->>API: OK or 429 error
    
    API->>SubService: saveSubmission(code, lang, orgId)
    SubService->>MongoDB: Insert submission
    MongoDB-->>SubService: Submission ID
    SubService-->>API: Submission created
    
    API->>OrgService: updateUsage(orgId, "submission", 1)
    OrgService->>MongoDB: Increment submissionsThisMonth
    MongoDB-->>OrgService: Updated
    
    API-->>Client: 201 Created
```

---

## Usage Tracking Flow

```mermaid
stateDiagram-v2
    [*] --> CheckAuth: Request arrives
    CheckAuth --> LoadOrg: API key valid
    CheckAuth --> [*]: 401 Unauthorized
    
    LoadOrg --> ResetIfNeeded: Organization found
    LoadOrg --> [*]: 404 Not Found
    
    ResetIfNeeded --> CheckActive: Reset if new month
    CheckActive --> CheckLimits: isActive = true
    CheckActive --> [*]: 403 Inactive
    
    CheckLimits --> ProcessRequest: Within limits
    CheckLimits --> [*]: 429 Quota exceeded
    
    ProcessRequest --> IncrementUsage: Operation successful
    IncrementUsage --> [*]: Response sent
```

---

## Database Queries Performance

### Common Queries

**1. Authenticate User**
```javascript
// Fast: Uses apiKey index
db.organizations.findOne({ apiKey: "spd_..." })
// Time: ~1-2ms with index
```

**2. Get Organization's Corpus**
```javascript
// Fast: Uses compound index
db.submissions.find({ 
  organizationId: ObjectId("..."),
  language: "python" 
})
// Time: ~5-10ms with index, returns 100-1000 docs
```

**3. Check Usage Statistics**
```javascript
// Fast: Single document lookup
db.organizations.findById(orgId)
// Time: ~1ms with primary key
```

**4. Monthly Usage Reset**
```javascript
// Triggered on auth, checks lastResetDate
if (currentMonth !== lastResetMonth) {
  org.usage.submissionsThisMonth = 0;
  org.usage.comparisonsThisMonth = 0;
  org.usage.lastResetDate = new Date();
  await org.save();
}
// Time: ~2-3ms
```

---

## Index Strategy

### Organizations Collection
```javascript
{
  _id: 1,                    // Primary key (auto)
  apiKey: 1 (unique),        // Fast auth lookup
  email: 1 (unique),         // Registration validation
  createdAt: 1               // Time-based queries
}
```

### Submissions Collection
```javascript
{
  _id: 1,                              // Primary key (auto)
  { organizationId: 1, language: 1 },  // Compound: Org corpus queries
  createdAt: 1                         // Time-based queries
}
```

**Index Sizes:**
- Organizations: ~10KB for 1000 orgs
- Submissions: ~1MB for 10,000 submissions
- Total estimated: ~5MB for 10 orgs × 1000 submissions each

---

## Scaling Considerations

### Horizontal Scaling
- **Stateless API**: All state in MongoDB, easy to add servers
- **Shared Database**: Single MongoDB instance with connection pooling
- **Cache Layer**: Redis for corpus caching (optional)

### Vertical Scaling (Database)
```mermaid
graph TD
    API1[API Server 1]
    API2[API Server 2]
    API3[API Server 3]
    
    PRIMARY[(MongoDB Primary)]
    SECONDARY1[(MongoDB Secondary 1)]
    SECONDARY2[(MongoDB Secondary 2)]
    
    API1 --> PRIMARY
    API2 --> PRIMARY
    API3 --> PRIMARY
    
    PRIMARY --> SECONDARY1
    PRIMARY --> SECONDARY2
    
    SECONDARY1 --> |Read Queries| API1
    SECONDARY2 --> |Read Queries| API2
```

### Sharding Strategy (Future)
- **Shard Key:** `organizationId`
- **Benefit:** Each organization's data on different shard
- **When:** > 1TB data or > 1000 organizations

---

## Data Retention Policy

### Submissions
- **Retention:** Indefinite (for academic integrity)
- **Archival:** Submissions older than 2 years moved to cold storage
- **Deletion:** Manual only, upon organization request

### Organizations
- **Active:** Indefinite
- **Inactive:** Marked `isActive: false`, not deleted
- **Purge:** Only on explicit GDPR request

---

## Backup Strategy

```mermaid
flowchart TD
    PROD[(Production DB)]
    SNAPSHOT1[Daily Snapshot]
    SNAPSHOT2[Weekly Snapshot]
    SNAPSHOT3[Monthly Snapshot]
    S3[S3 Storage]
    
    PROD -->|Every day 2am| SNAPSHOT1
    PROD -->|Every Sunday| SNAPSHOT2
    PROD -->|1st of month| SNAPSHOT3
    
    SNAPSHOT1 --> S3
    SNAPSHOT2 --> S3
    SNAPSHOT3 --> S3
    
    S3 -->|30 days| DELETE1[Delete daily]
    S3 -->|90 days| DELETE2[Delete weekly]
    S3 -->|1 year| DELETE3[Keep monthly]
```

---

## Security Considerations

### Data Access Control
- ✅ **Row-level isolation:** Organizations only see their own submissions
- ✅ **API key encryption:** bcrypt hashing (future enhancement)
- ✅ **Input validation:** Mongoose schemas + Zod validation
- ✅ **SQL injection:** Prevented by Mongoose ODM

### PII Handling
- **Organization email:** Stored encrypted (future)
- **Submission code:** May contain PII, warn users
- **API keys:** Treat as secrets, show only once on creation

---

## Monitoring Queries

### Active Organizations
```javascript
db.organizations.countDocuments({ isActive: true })
```

### Organizations Near Limits
```javascript
db.organizations.find({
  $expr: {
    $gte: ["$usage.submissionsThisMonth", { $multiply: ["$limits.maxSubmissionsPerMonth", 0.9] }]
  }
})
```

### Total Submissions by Language
```javascript
db.submissions.aggregate([
  { $group: { _id: "$language", count: { $sum: 1 } } }
])
```

### Organizations by Plan
```javascript
db.organizations.aggregate([
  { $group: { _id: "$plan", count: { $sum: 1 } } }
])
```

---

## Migration Scripts

### Add organizationId to Existing Submissions
```javascript
// For backward compatibility, existing submissions without orgId
db.submissions.updateMany(
  { organizationId: { $exists: false } },
  { $set: { organizationId: null } }
)
```

### Upgrade Plan
```javascript
// Manual upgrade (admin operation)
db.organizations.updateOne(
  { _id: ObjectId("...") },
  { 
    $set: { 
      plan: "pro",
      "limits.maxSubmissionsPerMonth": 10000,
      "limits.maxComparisonsPerMonth": 50000
    }
  }
)
```

---

**Legend:**
- PK = Primary Key
- FK = Foreign Key
- UK = Unique Key
- Indexed = Database index for fast queries
- Nullable = Optional field
