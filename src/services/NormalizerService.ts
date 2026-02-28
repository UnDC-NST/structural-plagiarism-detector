import Parser from "tree-sitter";
import { IRNode, INormalizerService } from "../types";

export class NormalizerService implements INormalizerService {
  
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

  
  private visit(node: Parser.SyntaxNode): IRNode {
    const children = node.children
      .filter((child) => !this.shouldDrop(child))
      .map((child) => this.visit(child));

    return { type: node.type, children };
  }

  
  private shouldDrop(node: Parser.SyntaxNode): boolean {
    if (NormalizerService.DROPPED_TYPES.has(node.type)) return true;
    if (!/[a-zA-Z]/.test(node.type)) return true;
    return false;
  }
}
