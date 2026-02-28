import { IRNode, ISerializerService } from "../types";

export class SerializerService implements ISerializerService {
  public serialize(ir: IRNode): string {
    const tokens: string[] = [];
    this.dfs(ir, 0, tokens);
    return tokens.join(" ");
  }

  
  private dfs(node: IRNode, depth: number, tokens: string[]): void {
    tokens.push(`${node.type}:${depth}`);
    for (const child of node.children) {
      this.dfs(child, depth + 1, tokens);
    }
  }
}
