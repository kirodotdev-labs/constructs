import { Construct, type IConstruct } from 'constructs';
import * as path from 'path';
import { Assembly, type IAssembly } from './synthesis/assembly.js';
import { isSynthesizable } from './synthesis/synthesizable.js';
import type { IModelProvider } from './model-provider.js';
import { Cache } from './cache.js';
import { ConsoleLogger, type ILogger } from './logger.js';

export interface AppProps {
  /** Output directory. @default '.kiro-constructs.out' */
  readonly outdir?: string;
  /** Source directory for resolving relative paths. @default process.cwd() */
  readonly sourceDir?: string;
  /** Extensible context values accessible via node.tryGetContext() */
  readonly context?: Record<string, unknown>;
  /** Model provider for LLM-assisted synth */
  readonly modelProvider?: IModelProvider;
  /** Logger for synth output. @default ConsoleLogger */
  readonly logger?: ILogger;
}

/**
 * Root construct that synthesizes the construct tree to an output directory.
 */
export class App extends Construct {
  public readonly outdir: string;
  public readonly sourceDir: string;
  public readonly modelProvider?: IModelProvider;
  public readonly cache: Cache;
  public readonly logger: ILogger;
  private assembly?: Assembly;

  static of(construct: IConstruct): App {
    const root = construct.node.root;
    if (!(root instanceof App)) {
      throw new Error(`Construct '${construct.node.path}' must be within an App`);
    }
    return root;
  }

  constructor(props: AppProps = {}) {
    super(undefined as unknown as Construct, '');
    this.outdir = props.outdir ?? '.kiro-constructs.out';
    this.sourceDir = path.resolve(props.sourceDir ?? process.cwd());
    this.logger = props.logger ?? new ConsoleLogger();
    this.modelProvider = props.modelProvider;
    this.cache = new Cache(this.sourceDir);

    if (this.modelProvider) {
      this.modelProvider.configure(this);
    }

    if (props.context) {
      for (const [key, value] of Object.entries(props.context)) {
        this.node.setContext(key, value);
      }
    }
  }

  /** Synthesize all constructs to the output directory */
  async synth(): Promise<Assembly> {
    if (this.assembly) {
      return this.assembly;
    }

    this.validate();
    this.assembly = new Assembly(this.outdir);
    await this.synthesizeTree(this, this.assembly);

    return this.assembly;
  }

  private validate(): void {
    const errors: string[] = [];
    for (const child of this.node.findAll()) {
      errors.push(...child.node.validate().map((e) => `[${child.node.path}] ${e}`));
    }
    if (errors.length > 0) {
      throw new Error(`Validation failed:\n  ${errors.join('\n  ')}`);
    }
  }

  private async synthesizeTree(construct: IConstruct, assembly: IAssembly): Promise<void> {
    if (isSynthesizable(construct)) {
      await construct.synthesize(assembly);
    }
    for (const child of construct.node.children) {
      await this.synthesizeTree(child, assembly);
    }
  }
}
