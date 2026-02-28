import { IRNode, ISerializerService } from "../types";

/**
 * SerializerService
 *
 * SRP  — Only responsible for converting an IRNode tree into a canonical string.
 * Pure + Stateless — deterministic pre-order DFS, no side effects.
 *
 * Output format: space-separated "type:depth" tokens.
 *
 *   "module:0 function_definition:1 parameters:2 block:1 if_statement:2 return_statement:3"
 *
 * Why encode depth?
 *   The VectorizerService uses depth to weight token contributions:
 *     weight = 1 / (depth + 1)
 *   Shallow structural nodes (function definitions, class bodies) contribute more
 *   than deeply nested leaf-level constructs. This makes the frequency vector
 *   sensitive to high-level structure without fragmenting the feature space.
 *
 * Depth is encoded here (not in vectorizer) so that the stored serializedStructure
 * in MongoDB is self-contained and can be re-vectorized without re-parsing.
 *
 * Two structurally identical ASTs → identical output, regardless of variable
 * names, comments, whitespace, or literal values.
 */
export class SerializerService implements ISerializerService {
  public serialize(ir: IRNode): string {
    const tokens: string[] = [];
    this.dfs(ir, 0, tokens);
    return tokens.join(" ");
  }

  /** Pre-order DFS with depth tracking — parent before children, children in source order. */
  private dfs(node: IRNode, depth: number, tokens: string[]): void {
    tokens.push(`${node.type}:${depth}`);
    for (const child of node.children) {
      this.dfs(child, depth + 1, tokens);
    }
  }
}
