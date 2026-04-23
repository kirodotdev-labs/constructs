const LAZY_SYMBOL = Symbol.for('kiro-constructs.lazy');

export interface IResolvable {
  resolve(): unknown;
}

function isResolvable(x: unknown): x is IResolvable {
  return typeof x === 'object' && x !== null && LAZY_SYMBOL in x;
}

export function resolve<T>(value: T): T {
  if (isResolvable(value)) {
    return resolve(value.resolve()) as T;
  }
  if (Array.isArray(value)) {
    return value.map(resolve) as T;
  }
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = resolve(v);
    }
    return result as T;
  }
  return value;
}

export class Lazy {
  static any<T>(producer: () => T): T {
    return { resolve: producer, [LAZY_SYMBOL]: true } as unknown as T;
  }
}
