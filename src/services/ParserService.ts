import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import { IParserService, SupportedLanguage } from "../types";
import { AppError } from "../utils/AppError";

/**
 * ParserService
 *
 * SRP  — Only responsible for turning raw source code into a Tree-sitter Tree.
 * OCP  — New languages added via registerLanguage without touching parse logic.
 * Singleton — One shared Tree-sitter parser instance per process.
 */
export class ParserService implements IParserService {
  private static instance: ParserService;

  private readonly parser: Parser;
  private readonly languageRegistry: Map<SupportedLanguage, object>;

  private constructor() {
    this.parser = new Parser();
    this.languageRegistry = new Map<SupportedLanguage, object>();
    this.registerLanguage("python", Python);
  }

  public static getInstance(): ParserService {
    if (!ParserService.instance) {
      ParserService.instance = new ParserService();
    }
    return ParserService.instance;
  }

  private registerLanguage(lang: SupportedLanguage, grammar: object): void {
    this.languageRegistry.set(lang, grammar);
  }

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

/**
 * UnsupportedLanguageError extends AppError so the centralised errorHandler
 * automatically maps it to HTTP 400 without any controller try/catch logic.
 */
export class UnsupportedLanguageError extends AppError {
  constructor(lang: string) {
    super(400, `Unsupported language: "${lang}". Supported: python`);
    this.name = "UnsupportedLanguageError";
  }
}
