import { SupportedLanguage } from "../types";

export interface LanguageAdapter {
  readonly language: SupportedLanguage;
  
  getGrammar(): object;
  
  alwaysKeep?(): string[];
}

export class PythonAdapter implements LanguageAdapter {
  public readonly language: SupportedLanguage = "python";

  public getGrammar(): object {
    
    return require("tree-sitter-python");
  }

  public alwaysKeep(): string[] {
    return [
      "function_definition",
      "class_definition",
      "decorated_definition",
      "if_statement",
      "for_statement",
      "while_statement",
      "try_statement",
      "with_statement",
      "return_statement",
      "yield",
      "import_statement",
      "import_from_statement",
    ];
  }
}
