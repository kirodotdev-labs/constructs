import type { IConstruct } from 'constructs';
import { App } from './app.js';

export interface ILogger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
}

/**
 * Default logger that writes to console.
 */
export class ConsoleLogger implements ILogger {
  info(message: string): void {
    console.log(message);
  }

  warn(message: string): void {
    console.warn(message);
  }
}

/**
 * Scoped logger that prefixes messages with construct path.
 */
class ScopedLogger implements ILogger {
  constructor(
    private readonly logger: ILogger,
    private readonly prefix: string,
  ) {}

  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(`[${this.prefix}] ${message}`, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(`[${this.prefix}] ${message}`, data);
  }
}

/**
 * Get a logger scoped to a construct's node path.
 */
export class Logger {
  static of(construct: IConstruct): ILogger {
    const app = App.of(construct);
    return new ScopedLogger(app.logger, construct.node.path);
  }
}
