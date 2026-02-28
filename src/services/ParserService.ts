import Parser from "tree-sitter";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Python = require("tree-sitter-python");
import { IParserService, SupportedLanguage } from "../types";

/**
 * ParserService
 *
 * SRP  — Only responsible for turning raw source code into a Tree-sitter Tree.
 * OCP  — New languages are added via `registerLanguage`, existing logic untouched.
 * Singleton — Parser instance created once; reused across every request.
 */
export class ParserService implements IParserService {
  // ── Singleton ───────────────────────────────────────────────────────────────
  private static instance: ParserService;

  private readonly parser: Parser;
  private readonly languageRegistry: Map<SupportedLanguage, object>;

  private constructor() {
    this.parser = new Parser();
    this.languageRegistry = new Map<SupportedLanguage, object>();
    this.registerLanguage("python", Python);
  }

  /** Get or create the single shared parser instance. */
  public static getInstance(): ParserService {
    if (!ParserService.instance) {
      ParserService.instance = new ParserService();
    }
    return ParserService.instance;
  }

  // ── OCP: register additional languages without modifying this method ─────
  private registerLanguage(lang: SupportedLanguage, grammar: object): void {
    this.languageRegistry.set(lang, grammar);
  }

  // ── IParserService ──────────────────────────────────────────────────────────
  public parse(code: string, language: SupportedLanguage): Parser.Tree {
    const grammar = this.languageRegistry.get(language);
    if (!grammar) {
      throw new UnsupportedLanguageError(language);
    }
    this.parser.setLanguage(
      grammar as unknown as Parameters<Parser["setLanguage"]>[0],
    );
    return this.parser.parse(code);
  }
}

// ── Custom error — allows controllers to map to HTTP 400 ─────────────────────
export class UnsupportedLanguageError extends Error {
  constructor(lang: string) {
    super(`Unsupported language: "${lang}". Supported: python`);
    this.name = "UnsupportedLanguageError";
  }
}
