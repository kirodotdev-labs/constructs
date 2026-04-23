import type { IAssembly } from './assembly.js';

/**
 * Interface for constructs that can be synthesized.
 */
export interface ISynthesizable {
  /** Synthesize this construct to the assembly */
  synthesize(assembly: IAssembly): void | Promise<void>;
}

/** Type guard for ISynthesizable */
export function isSynthesizable(x: unknown): x is ISynthesizable {
  return (
    x !== null && typeof x === 'object' && 'synthesize' in x && typeof x.synthesize === 'function'
  );
}
