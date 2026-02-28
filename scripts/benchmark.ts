/**
 * scripts/benchmark.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates the similarity engine against 4 structured test datasets and
 * stress-tests the bulk vectorization pipeline at 10 / 25 / 50 file sizes.
 *
 * Run: npm run benchmark
 *
 * Expected results (evidence of algorithm quality):
 *   identical code          → score ≥ 0.99
 *   variable renamed        → score ≥ 0.90
 *   structural variation    → score 0.60 – 0.85
 *   completely different    → score ≤ 0.30
 */

import { ParserService } from "../src/services/ParserService";
import { NormalizerService } from "../src/services/NormalizerService";
import { SerializerService } from "../src/services/SerializerService";
import { VectorizerService } from "../src/services/VectorizerService";
import {
  SimilarityService,
  toConfidence,
} from "../src/services/SimilarityService";

// ── Initialise pipeline ───────────────────────────────────────────────────────
const parser = ParserService.getInstance();
const normalizer = new NormalizerService();
const serializer = new SerializerService();
const vectorizer = new VectorizerService();
const similarity = new SimilarityService();

// ── Pipeline helper ───────────────────────────────────────────────────────────
function vectorize(code: string) {
  const tree = parser.parse(code, "python");
  const ir = normalizer.normalize(tree);
  const serialized = serializer.serialize(ir);
  return vectorizer.vectorize(serialized);
}

function compare(codeA: string, codeB: string) {
  const vecA = vectorize(codeA);
  const vecB = vectorize(codeB);
  const score = similarity.computeSimilarity(vecA, vecB);
  return { score, confidence: toConfidence(score) };
}

// ── Test datasets ─────────────────────────────────────────────────────────────
const IDENTICAL_A = `
def calculate_total(items):
    total = 0
    for item in items:
        if item.price > 0:
            total += item.price
    return total
`;

const IDENTICAL_B = IDENTICAL_A; // exact same code

const RENAMED_B = `
def get_sum(elements):
    s = 0
    for e in elements:
        if e.cost > 0:
            s += e.cost
    return s
`;

const STRUCTURAL_VARIATION_B = `
def total_price(products):
    result = 0
    valid = [p for p in products if p.price > 0]
    for p in valid:
        result += p.price
    return result
`;

const DIFFERENT_ALGO = `
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
`;

// ── Run quality tests ─────────────────────────────────────────────────────────
function runQualityTests() {
  console.log("\n════════════════════════════════════════════");
  console.log("  SIMILARITY ENGINE QUALITY VALIDATION");
  console.log("════════════════════════════════════════════");

  const tests = [
    {
      label: "Identical code",
      codeA: IDENTICAL_A,
      codeB: IDENTICAL_B,
      expectedMin: 0.99,
      expectedMax: 1.0,
    },
    {
      label: "Variable renamed",
      codeA: IDENTICAL_A,
      codeB: RENAMED_B,
      expectedMin: 0.9,
      expectedMax: 1.0,
    },
    {
      label: "Structural variation",
      codeA: IDENTICAL_A,
      codeB: STRUCTURAL_VARIATION_B,
      expectedMin: 0.55,
      expectedMax: 0.9,
    },
    {
      label: "Completely different",
      codeA: IDENTICAL_A,
      codeB: DIFFERENT_ALGO,
      expectedMin: 0.0,
      expectedMax: 0.35,
    },
  ];

  let passed = 0;
  for (const t of tests) {
    const { score, confidence } = compare(t.codeA, t.codeB);
    const ok = score >= t.expectedMin && score <= t.expectedMax;
    if (ok) passed++;
    const status = ok ? "✅" : "❌";
    console.log(`\n  ${status} ${t.label}`);
    console.log(`     score:      ${score.toFixed(4)}`);
    console.log(`     confidence: ${confidence}`);
    console.log(
      `     expected:   ${t.expectedMin.toFixed(2)} – ${t.expectedMax.toFixed(2)}   ${ok ? "PASS" : "FAIL"}`,
    );
  }

  console.log(`\n  Result: ${passed}/${tests.length} tests passed`);
  if (passed < tests.length) {
    console.log(
      "  ⚠  Engine quality check FAILED — review NormalizerService or SerializerService.",
    );
    process.exit(1);
  }
}

// ── Run performance tests ─────────────────────────────────────────────────────
function makeSyntheticCode(i: number): string {
  return `
def function_${i}(x, y):
    total = 0
    for j in range(x):
        if j % 2 == 0:
            total += j * y
        else:
            total -= j
    return total
`;
}

function runPerformanceTests() {
  console.log("\n════════════════════════════════════════════");
  console.log("  BULK PERFORMANCE VALIDATION");
  console.log("════════════════════════════════════════════");

  for (const fileCount of [10, 25, 50]) {
    const codes = Array.from({ length: fileCount }, (_, i) =>
      makeSyntheticCode(i),
    );

    // Pre-vectorize — O(n)
    const vecStart = Date.now();
    const vectors = codes.map((c) => vectorize(c));
    const vecMs = Date.now() - vecStart;

    // Pairwise similarity — O(n²/2)
    const simStart = Date.now();
    let pairs = 0;
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        similarity.computeSimilarity(vectors[i], vectors[j]);
        pairs++;
      }
    }
    const simMs = Date.now() - simStart;
    const totalMs = vecMs + simMs;
    const heapMb = Math.round(process.memoryUsage().heapUsed / 1_048_576);

    console.log(`\n  files: ${fileCount}  |  pairs: ${pairs}`);
    console.log(`     vectorize:  ${vecMs}ms`);
    console.log(`     similarity: ${simMs}ms`);
    console.log(`     total:      ${totalMs}ms`);
    console.log(`     heap:       ${heapMb}MB`);

    if (totalMs > 5000) {
      console.log(
        `  ⚠  Total time ${totalMs}ms exceeds 5s threshold for ${fileCount} files.`,
      );
    } else {
      console.log(`  ✅ within acceptable limits`);
    }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
runQualityTests();
runPerformanceTests();
console.log("\n════════════════════════════════════════════\n");
