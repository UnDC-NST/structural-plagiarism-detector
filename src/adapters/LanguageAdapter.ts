import { SupportedLanguage } from "../types";

/**
 * LanguageAdapter — defines the contract for adding new language support.
 *
 * OCP: To add Java/C++ support, implement this interface and
 *      register it in ParserService.languageRegistry.
 *      Zero changes to existing services.
 */
export interface LanguageAdapter {
  readonly language: SupportedLanguage;
  /** Returns the tree-sitter grammar object for this language. */
  getGrammar(): object;
  /** Optional: language-specific node types that are ALWAYS structural (never dropped). */
  alwaysKeep?(): string[];
}

/**
 * PythonAdapter — concrete adapter for Python (tree-sitter-python).
 * Currently the only supported language.
 */
export class PythonAdapter implements LanguageAdapter {
  public readonly language: SupportedLanguage = "python";

  public getGrammar(): object {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
