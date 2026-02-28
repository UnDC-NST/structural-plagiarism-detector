# Viva Preparation Study Plan

> Strategic guide for learning and presenting the Structural Plagiarism Detector project

---

## 📅 Study Timeline

### Day 1-2: Core Understanding (Foundation)
**Goal:** Understand what the system does and why

**Read in this order:**
1. **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** (30 min)
   - Get the big picture
   - Understand the problem being solved
   - Learn the 5-stage algorithm

2. **[VIVA_QUESTIONS.md](VIVA_QUESTIONS.md)** - Q1 to Q5 (1 hour)
   - What is this project?
   - Why structural analysis?
   - What is an AST?
   - How does the algorithm work?
   - Why cosine similarity with depth weighting?

**Practice Exercise:**
- Explain the rename detection example to someone (or rubber duck!)
- Draw the algorithm pipeline from memory
- Calculate cosine similarity for a simple example

**Key Takeaway:** Be able to answer "What does this system do and why is it better than text-based detection?"

---

### Day 3-4: Architecture & Design Patterns
**Goal:** Understand how the system is built

**Read:**
1. **[VIVA_QUESTIONS.md](VIVA_QUESTIONS.md)** - Q6 to Q8 (2 hours)
   - Architecture pattern
   - 8 design patterns with examples
   - SOLID principles implementation

2. **[CHEAT_SHEET.md](CHEAT_SHEET.md)** - Design Patterns section (30 min)
   - Quick reference for each pattern

3. **Browse actual code:**
   - [src/repositories/SubmissionRepository.ts](src/repositories/SubmissionRepository.ts) - Repository pattern
   - [src/middlewares/authMiddleware.ts](src/middlewares/authMiddleware.ts) - Factory pattern
   - [src/services/EnhancedSubmissionService.ts](src/services/EnhancedSubmissionService.ts) - Decorator pattern

**Practice Exercise:**
- Draw the layered architecture diagram
- Pick 3 design patterns and explain with code examples
- Explain how dependency injection works in container.ts

**Key Takeaway:** Be able to name all 8 patterns and explain 3-4 deeply with code examples.

---

### Day 5-6: Multi-Tenancy & Organizations
**Goal:** Understand the business model and multi-tenant architecture

**Read:**
1. **[ORGANIZATIONS.md](ORGANIZATIONS.md)** - Full document (1 hour)
   - Organization registration flow
   - Plan tiers and limits
   - Usage tracking mechanism

2. **[VIVA_QUESTIONS.md](VIVA_QUESTIONS.md)** - Q9 to Q12 (1.5 hours)
   - What is multi-tenancy?
   - How does organization isolation work?
   - Plan-based usage limits
   - Why track submissions and comparisons separately?

3. **Code Review:**
   - [src/models/Organization.ts](src/models/Organization.ts) - Schema and methods
   - [src/services/OrganizationService.ts](src/services/OrganizationService.ts) - Business logic
   - [src/controllers/OrganizationController.ts](src/controllers/OrganizationController.ts) - API endpoints

**Practice Exercise:**
- Memorize the 4 plan tiers and their limits
- Trace a request from API key to organization lookup
- Explain how monthly usage reset works

**Key Takeaway:** Be able to explain: "How does the system serve multiple universities while keeping their data isolated?"

---

### Day 7-8: Algorithm Deep Dive
**Goal:** Master the mathematical foundation

**Read:**
1. **[VIVA_QUESTIONS.md](VIVA_QUESTIONS.md)** - Q13 to Q16 (2 hours)
   - Normalization process
   - Depth-weighted vectorization formula
   - Cosine similarity calculation
   - Why Tree-sitter?

2. **[CHEAT_SHEET.md](CHEAT_SHEET.md)** - Mathematical Formulas section (30 min)
   - Depth weight formula
   - Cosine similarity formula
   - Bulk comparison count

**Practice Exercise:**
- Take 2 simple code snippets
- Manually parse to AST (use online Tree-sitter playground)
- Normalize, serialize, vectorize step by step
- Calculate cosine similarity by hand
- Verify with actual API call

**Key Takeaway:** Be able to calculate similarity score manually for simple examples.

---

### Day 9-10: Production Features
**Goal:** Understand production-readiness aspects

**Read:**
1. **[VIVA_QUESTIONS.md](VIVA_QUESTIONS.md)** - Q17 to Q20 (2 hours)
   - Caching strategy
   - Circuit breaker pattern
   - Scalability approach
   - Graceful shutdown

2. **[SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)** - Performance & Scalability sections (1 hour)

**Practice Exercise:**
- Draw the circuit breaker state diagram
- Explain horizontal scaling with diagram
- Calculate cache hit rate impact on performance

**Key Takeaway:** Be able to explain: "What makes this production-ready beyond just working code?"

---

### Day 11-12: Security & Observability
**Goal:** Understand security and monitoring

**Read:**
1. **[VIVA_QUESTIONS.md](VIVA_QUESTIONS.md)** - Q21 to Q24 (1.5 hours)
   - Security measures
   - Error handling
   - Logging and observability
   - Health checks

2. **[CHEAT_SHEET.md](CHEAT_SHEET.md)** - Health Checks, API Response Codes (20 min)

**Practice Exercise:**
- List all 7 security measures
- Explain the difference between liveness and readiness probes
- Trace how an error flows from service → controller → client

**Key Takeaway:** Be able to explain: "How is this system secured and monitored?"

---

### Day 13-14: Advanced Topics & Trade-offs
**Goal:** Show deeper understanding and critical thinking

**Read:**
1. **[VIVA_QUESTIONS.md](VIVA_QUESTIONS.md)** - Q25 to Q30 (2 hours)
   - Language extensibility
   - Comparison with existing tools
   - Future improvements
   - Design trade-offs
   - Testing strategy
   - Personal learnings

**Practice Exercise:**
- Pick 3 future improvements and explain how you'd implement them
- For each major decision, articulate the trade-off
- Prepare your answer to "What did you learn?"

**Key Takeaway:** Be able to discuss improvements, limitations, and trade-offs thoughtfully.

---

## 🎯 Final Preparation (Day 15)

### Morning: Practice Presentation
**5-Minute Overview** (practice 5 times):
1. Problem statement (30 sec)
2. Solution approach - AST-based detection (1 min)
3. Algorithm - 5 stages (1 min)
4. Architecture - layers + patterns (1 min)
5. Production features - multi-tenancy, caching, monitoring (1 min)
6. Results & impact (30 sec)

### Afternoon: Mock Viva
**Common Opening Questions:**
1. "Tell me about your project"
2. "What problem does it solve?"
3. "How is it different from existing solutions?"
4. "Walk me through the algorithm"
5. "What design patterns did you use?"

**Deep Dive Questions (prepare for these):**
- "Why did you choose X over Y?" (for any design decision)
- "What would happen if...?" (failure scenarios)
- "How would you scale this to 100,000 users?"
- "What's the time complexity of your algorithm?"
- "How do you ensure data security?"

### Evening: Final Review
1. **[CHEAT_SHEET.md](CHEAT_SHEET.md)** - Full read (30 min)
   - Memorize key numbers
   - Review all formulas
   - Check common error messages

2. **Code Walkthrough** (30 min)
   - Open [src/app.ts](src/app.ts) - entry point
   - Follow a request from route → controller → service → repository
   - Understand the flow completely

---

## 📋 Pre-Viva Checklist

### Technical Knowledge
- [ ] Can explain the 5-stage algorithm in detail
- [ ] Can calculate cosine similarity manually
- [ ] Can name and explain 8 design patterns
- [ ] Can explain all 5 SOLID principles
- [ ] Know all 4 plan tiers and limits (Free: 100/500, etc.)
- [ ] Understand multi-tenancy isolation mechanism
- [ ] Can explain circuit breaker states
- [ ] Know key performance metrics (cache hit rate 70-90%, etc.)

### Practical Understanding
- [ ] Have run the system locally
- [ ] Have created an organization via API
- [ ] Have submitted code and analyzed it
- [ ] Have tested bulk comparison
- [ ] Have checked metrics endpoints
- [ ] Understand the MongoDB schema

### Communication
- [ ] Can explain to non-technical person what it does
- [ ] Can answer "Why this approach?" for major decisions
- [ ] Have prepared examples for each concept
- [ ] Can draw architecture diagram from memory
- [ ] Can discuss limitations honestly

---

## 🎤 During the Viva: Strategy

### Opening (First Impression)
**Start strong with a clear overview:**
> "This is a multi-tenant plagiarism detection API for educational institutions. Unlike traditional text-based tools, it analyzes code structure using Abstract Syntax Trees, making it immune to variable renaming. Universities can register, get API keys, and check student submissions against their corpus within plan-based usage limits."

### Answering Questions

**Use the STAR method for complex questions:**
- **S**ituation: What was the problem?
- **T**ask: What did you need to achieve?
- **A**ction: How did you solve it?
- **R**esult: What was the outcome?

**Example:**
> Q: "Why use depth-weighted vectorization?"
> 
> **Situation**: Simple frequency counting treats all AST nodes equally, but top-level structure (classes, functions) is more important than nested implementation (if statements deep inside).
> 
> **Task**: Needed a way to give more weight to important structural elements.
> 
> **Action**: Implemented depth-weighted frequency where weight = 1/(depth+1), so top-level nodes contribute more to the similarity score.
> 
> **Result**: Better detection of architectural similarity vs just implementation similarity.

### If You Don't Know
**Never guess!** Instead:
1. "That's a great question. I haven't implemented that yet, but here's how I would approach it..."
2. "I don't have that detail memorized, but I can show you where it's documented..."
3. "I focused on X instead of Y because [reason], but Y would be an excellent future enhancement."

### Show Enthusiasm
- Use phrases like "What I found interesting was..."
- "One challenge I solved was..."
- "I'm particularly proud of..."

---

## 💡 Secret Weapons

### The Rename Example
**Always have this ready** - it's your best demo:
```python
# Original
def calculate_factorial(number):
    if number == 0:
        return 1
    return number * calculate_factorial(number - 1)

# Renamed (98% similar!)
def compute_fact(n):
    if n == 0:
        return 1
    return n * compute_fact(n - 1)
```

Show how text-based detection would miss this, but structural analysis catches it.

### The Architecture Diagram
**Draw this quickly:**
```
Client → Controllers → Services → Repositories → Database
         ↓ Middleware (Auth, Rate Limit, Error)
         ↓ Caching Layer
         ↓ Observability (Metrics, Logs)
```

### The Algorithm Flow
**Draw the pipeline:**
```
Code → Parse → Normalize → Serialize → Vectorize → Compare → Score
```

### Key Number Drops
When relevant, mention specific metrics:
- "We achieve 70-90% cache hit rate in production"
- "Response time is under 100ms at p95"
- "Circuit breaker opens after 5 failures and retries after 60 seconds"
- "Similarity threshold of 0.85 balances false positives and false negatives"

Numbers show you understand the system deeply!

---

## 🚫 Common Mistakes to Avoid

1. **Too much detail too soon** - Start broad, go deep when asked
2. **Memorizing without understanding** - Use examples to show you understand
3. **Ignoring the "why"** - Every "what" should have a "why"
4. **Being defensive about limitations** - Acknowledge them and discuss trade-offs
5. **Going off topic** - Listen to the question, answer specifically
6. **Forgetting business value** - Connect technical decisions to user needs
7. **Reading documentation** - Glance for numbers, but speak naturally

---

## 📊 Self-Assessment Test

### Before viva, you should be able to answer (without looking):

**Core Understanding:**
1. What problem does this solve?
2. Why structural analysis over text comparison?
3. What are the 5 stages of the algorithm?
4. What is the similarity threshold?

**Technical Details:**
5. Name 5 design patterns used
6. What is the depth weight formula?
7. How is cosine similarity calculated?
8. What is the cache hit rate target?

**Architecture:**
9. Draw the layered architecture
10. Explain multi-tenancy isolation
11. What are the 4 plan tiers?
12. How does circuit breaker work?

**Production:**
13. What security measures are in place?
14. How is performance monitored?
15. What makes this production-ready?

**If you can confidently answer 13+/15, you're ready!**

---

## 🎓 Final Tips

### Day Before Viva
- ✅ Review [CHEAT_SHEET.md](CHEAT_SHEET.md) - know the numbers
- ✅ Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - refresh big picture
- ✅ Practice 5-minute presentation
- ✅ Prepare questions for examiners (shows engagement!)
- ✅ Get good sleep!

### Morning of Viva
- ✅ Quick review of [VIVA_QUESTIONS.md](VIVA_QUESTIONS.md) Q1-Q5
- ✅ Visualize success
- ✅ Have [CHEAT_SHEET.md](CHEAT_SHEET.md) open (if allowed)

### During Viva
- 🎯 **Listen carefully** to questions
- 🎯 **Pause before answering** (shows thoughtfulness)
- 🎯 **Use examples** (code, diagrams, scenarios)
- 🎯 **Connect to theory** (SOLID, design patterns)
- 🎯 **Show enthusiasm** for what you built
- 🎯 **Be honest** about limitations

---

## 🏆 Confidence Builders

**Remember:**
1. You understand this system better than anyone
2. You've built something production-ready
3. You can explain complex concepts clearly
4. You've thought about trade-offs and improvements
5. You're prepared!

**Your unique story:**
- You implemented 8 design patterns in real use
- You built a complete multi-tenant system
- You achieved 70-90% cache hit rate
- You made it production-ready with monitoring
- You learned deeply about compilers, algorithms, and architecture

**You've got this! 🌟**

---

## 📚 Resources Quick Links

**Main Study Documents:**
- [CHEAT_SHEET.md](CHEAT_SHEET.md) - Formulas & key numbers
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - One-page overview
- [VIVA_QUESTIONS.md](VIVA_QUESTIONS.md) - 30 questions with answers
- [ORGANIZATIONS.md](ORGANIZATIONS.md) - Multi-tenancy guide
- [README.md](README.md) - Complete documentation

**For Deep Dives:**
- [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) - Architecture details
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment

**Code to Review:**
- `src/services/` - Core business logic
- `src/controllers/` - API endpoints
- `src/models/` - Data schemas
- `src/container.ts` - Dependency injection

---

**Good luck with your viva! You're well-prepared! 🎓✨**
