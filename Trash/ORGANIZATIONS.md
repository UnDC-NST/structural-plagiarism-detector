# Organization Management & Multi-Tenant Usage

This plagiarism detection service is designed for **organizations and educational institutions** to check multiple code submissions for plagiarism and structural similarity.

## For Organizations

This API provides a complete multi-tenant platform where:
- **Each organization** gets their own API key and isolated data
- **Usage tracking** per organization with plan-based limits
- **Scalable** for institutions handling hundreds or thousands of submissions
- **Isolated comparisons** - organizations only compare against their own submissions (optional)

---

## Organization Plans

| Plan | Submissions/Month | Comparisons/Month | Max File Size | Bulk Files |
|------|-------------------|-------------------|---------------|------------|
| **Free** | 100 | 500 | 1MB | 10 |
| **Basic** | 1,000 | 5,000 | 5MB | 25 |
| **Pro** | 10,000 | 50,000 | 10MB | 50 |
| **Enterprise** | Unlimited | Unlimited | 50MB | 100 |

---

## Getting Started as an Organization

### 1. Create an Organization Account

```bash
curl -X POST http://localhost:3000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "University of Example",
    "email": " plagiarism@example.edu",
    "plan": "free"
  }'
```

**Response:**
```json
{
  "organization": {
    "id": "654a1b2c3d4e5f6g7h8i9j0k",
    "name": "University of Example",
    "email": "plagiarism@example.edu",
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

**⚠️ Important**: Save your API key securely - it cannot be retrieved later!

### 2. Use Your API Key

Include your API key in all API requests:

```bash
export API_KEY="spd_1234567890abcdef..."

curl -X POST http://localhost:3000/api/v1/submissions \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "code": "def factorial(n):\\n    return 1 if n == 0 else n * factorial(n-1)",
    "language": "python"
  }'
```

### 3. Check Organization Details

```bash
curl http://localhost:3000/api/v1/organizations/me \
  -H "x-api-key: $API_KEY"
```

**Response:**
```json
{
  "organization": {
    "id": "654a...",
    "name": "University of Example",
    "email": "plagiarism@example.edu",
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

### 4. Monitor Usage

```bash
curl http://localhost:3000/api/v1/organizations/usage \
  -H "x-api-key: $API_KEY"
```

**Response:**
```json
{
  "usage": {
    "organization": {
      "id": "654a...",
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
    "resetDate": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Usage Limits & Enforcement

### Automatic Usage Tracking

Every API call is automatically tracked:
- **Submissions**: POST `/api/v1/submissions` increments submission counter
- **Comparisons**: POST `/api/v1/analyze` and POST `/api/v1/compare` increment comparison counter
- **Bulk Comparisons**: POST `/api/v1/compare/bulk` with N files = N*(N-1)/2 comparisons

### Monthly Reset

Usage counters reset automatically on the 1st of each month.

### Exceeded Limits

When limits are exceeded, API returns `429 Too Many Requests`:

```json
{
  "error": "Monthly comparison limit exceeded (500). Upgrade your plan or wait for next month."
}
```

---

## Organization Isolation (Optional)

By default, organizations can compare submissions against their own corpus only:

```bash
# This compares against only YOUR organization's submissions
curl -X POST http://localhost:3000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "code": "...",
    "language": "python"
  }'
```

This ensures:
- ✅ **Data privacy**: Your submissions aren't compared with other organizations
- ✅ **Relevant results**: Comparisons are within your own submission set
- ✅ **Multi-tenancy**: Complete isolation between organizations

---

## Common Use Cases

### 1. Educational Institutions

**Scenario**: University course with 200 students submitting Python assignments

```bash
# Each student submission
for student in students:
  curl -X POST http://localhost:3000/api/v1/submissions \
    -H "x-api-key: $API_KEY" \
    -d "{\"code\": \"$student_code\", \"language\": \"python\"}"

# Analyze new submission against all previous ones
curl -X POST http://localhost:3000/api/v1/analyze \
  -H "x-api-key: $API_KEY" \
  -d "{\"code\": \"$new_submission\", \"language\": \"python\"}"
```

**Result**: Detect if new submission is too similar to previous submissions

### 2. Coding Bootcamps

**Scenario**: Batch compare all student submissions at end of assignment

```bash
curl -X POST http://localhost:3000/api/v1/compare/bulk \
  -H "x-api-key: $API_KEY" \
  -d '{
    "submissions": [
      {"code": "...", "label": "student_A"},
      {"code": "...", "label": "student_B"},
      {"code": "...", "label": "student_C"}
    ],
    "language": "python"
  }'
```

**Result**: Pairwise similarity matrix shows which students have suspiciously similar code

### 3. Online Learning Platforms

**Scenario**: Real-time plagiarism check as students submit

1. Student submits code
2. API analyzes against corpus
3. If `flagged: true`, trigger manual review
4. Store submission for future comparisons

```bash
# Analyze and store in one workflow
SUBMISSION_ID=$(curl -X POST .../submissions | jq -r '.submissionId')
RESULT=$(curl -X POST .../analyze -d "...")

if [ "$(echo $RESULT | jq -r '.flagged')" == "true" ]; then
  echo "⚠️ Potential plagiarism detected - manual review needed"
fi
```

---

## API Endpoints

### Organization Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/organizations` | ❌ | Create new organization (self-registration) |
| GET | `/api/v1/organizations/me` | ✅ | Get current organization details |
| GET | `/api/v1/organizations/usage` | ✅ | Get usage statistics |

### Plagiarism Detection (Requires API Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/submissions` | Store a code submission |
| GET | `/api/v1/submissions/:id` | Retrieve submission by ID |
| POST | `/api/v1/analyze` | Compare code against corpus |
| POST | `/api/v1/compare` | Compare two code snippets |
| POST | `/api/v1/compare/bulk` | Batch compare multiple files |

---

## Best Practices

### 1. Secure API Key Storage

```bash
# ✅ Good: Environment variable
export API_KEY="spd_..."

# ❌ Bad: Hardcoded in code
const API_KEY = "spd_...";
```

### 2. Rate Limiting

All API endpoints have rate limiting:
- **Default**: 100 requests per 15 minutes per IP
- **Configurable** via `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS`

### 3. Monitor Usage

Check usage regularly to avoid hitting limits:

```bash
# Check usage before bulk operations
USAGE=$(curl -H "x-api-key: $API_KEY" .../usage | jq '.usage.percentageUsed.comparisons')

if [ $USAGE -gt 80 ]; then
  echo "⚠️ Warning: At 80% of comparison limit"
fi
```

### 4. Plan Upgrades

Contact support to upgrade your plan:
- Free → Basic: 10x more submissions and comparisons
- Basic → Pro: 10x more + larger files
- Pro → Enterprise: Unlimited usage + priority support

---

##Troubleshooting

### "Invalid API key"
- Check that you're using the correct API key from organization creation
- Ensure key is being sent in `x-api-key` header

### "Monthly limit exceeded"
- Check usage: `GET /api/v1/organizations/usage`
- Wait for monthly reset or upgrade plan
- Contact support for temporary limit increase

### "Organization account is inactive"
- Organization may have been suspended due to policy violation
- Contact support for reactivation

---

## Development vs Production

### Development Mode (In-Memory)

```bash
USE_IN_MEMORY_DB=true npm run dev
```

- ✅ No MongoDB required
- ✅ Fast startup
- ❌ No organization persistence
- ❌ Data lost on restart
- **Use for**: Local development, testing

### Production Mode (MongoDB)

```bash
NODE_ENV=production npm start
```

- ✅ Full organization support
- ✅ Data persistence
- ✅ Usage tracking
- ✅ Multi-tenancy
- **Required for**: Production deployments

---

## Security

- **API Keys**: 64-character secure random keys (`spd_` prefix)
- **HTTPS**: Always use HTTPS in production
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Zod schemas validate all inputs
- **No SQL Injection**: Mongoose ODM with parameterized queries
- **Organization Isolation**: Data separated by organization

---

## Support & Contact

For questions, issues, or plan upgrades:
- **Issues**: GitHub Issues
- **Security**: security@example.com
- **Sales**: sales@example.com
- **Documentation**: See [README.md](README.md) and [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)
