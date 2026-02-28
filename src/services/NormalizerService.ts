import Parser from "tree-sitter";
import { IRNode, INormalizerService } from "../types";

/**
 * NormalizerService
 *
 * SRP — Only responsible for transforming a Tree-sitter AST into a clean IRNode tree.
 * Pure + Stateless — takes a tree, returns IR, no side effects.
 *
 * Filtering strategy (aggressive, per review feedback):
 *   DROP  → comment nodes, named punctuation (":","(",")",",","[","]","{","}")
 *   DROP  → leaf nodes that are pure literals (identifiers, strings, numbers, booleans)
 *   DROP  → nodes whose type consists only of non-alphabetic characters (operators)
 *   KEEP  → all structural node types that describe code shape
 */
export class NormalizerService implements INormalizerService {
  // ── Node types to drop entirely (no structural value) ───────────────────────
  private static readonly DROPPED_TYPES = new Set<string>([
    "comment",
    "identifier",
    "string",
    "string_content",
    "integer",
    "float",
    "true",
    "false",
    "none",
    // punctuation tokens
    ":",
    ",",
    ".",
    ";",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    "->",
    "=>",
    "...",
    '"',
    "'",
    '"""',
    "'''",
  ]);

  public normalize(tree: Parser.Tree): IRNode {
    return this.visit(tree.rootNode);
  }

  // ── Recursive DFS visitor ───────────────────────────────────────────────────
  private visit(node: Parser.SyntaxNode): IRNode {
    const children = node.children
      .filter((child) => !this.shouldDrop(child))
      .map((child) => this.visit(child));

    return { type: node.type, children };
  }

  /**
   * Returns true if the node carries no structural information:
   *  1. It is in the explicit drop list.
   *  2. Its type has no alphabetic characters (raw operators like "==", "+=").
   */
  private shouldDrop(node: Parser.SyntaxNode): boolean {
    if (NormalizerService.DROPPED_TYPES.has(node.type)) return true;
    if (!/[a-zA-Z]/.test(node.type)) return true;
    return false;
  }
}
