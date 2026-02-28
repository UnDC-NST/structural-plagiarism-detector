import { IRNode, ISerializerService } from "../types";

/**
 * SerializerService
 *
 * SRP  — Only responsible for converting an IRNode tree into a canonical string.
 * Pure + Stateless — deterministic pre-order DFS, no side effects.
 *
 * Output: space-separated sequence of node type strings, e.g.
 *   "module function_definition parameters block return_statement binary_operator"
 *
 * Two structurally identical ASTs → identical output, regardless of variable
 * names, comments, whitespace, or literal values.
 */
export class SerializerService implements ISerializerService {
  public serialize(ir: IRNode): string {
    const tokens: string[] = [];
    this.dfs(ir, tokens);
    return tokens.join(" ");
  }

  /** Pre-order DFS — parent before children, children in source order. */
  private dfs(node: IRNode, tokens: string[]): void {
    tokens.push(node.type);
    for (const child of node.children) {
      this.dfs(child, tokens);
    }
  }
}
