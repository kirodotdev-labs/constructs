import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

interface CacheEntry {
  inputHash: string;
}

interface CacheManifest {
  version: number;
  entries: Record<string, CacheEntry>;
}

/**
 * Per-entry cache with manifest for LLM-generated content.
 * Structure:
 *   .kiro-constructs.cache/
 *   ├── manifest.json
 *   └── entries/
 *       └── {sanitized-key}.md
 */
export class Cache {
  private readonly cacheDir: string;
  private readonly entriesDir: string;
  private readonly manifestPath: string;
  private manifest: CacheManifest;

  constructor(baseDir: string) {
    this.cacheDir = path.join(baseDir, '.kiro-constructs.cache');
    this.entriesDir = path.join(this.cacheDir, 'entries');
    this.manifestPath = path.join(this.cacheDir, 'manifest.json');
    this.manifest = this.loadManifest();
  }

  private loadManifest(): CacheManifest {
    if (fs.existsSync(this.manifestPath)) {
      return JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8')) as CacheManifest;
    }
    return { version: 1, entries: {} };
  }

  private saveManifest(): void {
    fs.mkdirSync(this.cacheDir, { recursive: true });
    fs.writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2) + '\n');
  }

  private sanitizeKey(key: string): string {
    return key.replace(/\//g, '--');
  }

  private entryPath(key: string): string {
    return path.join(this.entriesDir, this.sanitizeKey(key) + '.md');
  }

  /** Compute input hash from content and rules */
  static hash(content: string, rules: string[]): string {
    return crypto
      .createHash('sha256')
      .update(content + JSON.stringify(rules))
      .digest('hex')
      .slice(0, 12);
  }

  /** Get cached content if hash matches */
  get(key: string, inputHash: string): string | undefined {
    const entry = this.manifest.entries[key];
    if (entry?.inputHash === inputHash && fs.existsSync(this.entryPath(key))) {
      return fs.readFileSync(this.entryPath(key), 'utf-8');
    }
    return undefined;
  }

  /** Get stale cached content (hash mismatch but entry exists) */
  getStale(key: string): string | undefined {
    if (this.manifest.entries[key] && fs.existsSync(this.entryPath(key))) {
      return fs.readFileSync(this.entryPath(key), 'utf-8');
    }
    return undefined;
  }

  /** Set cached content */
  set(key: string, inputHash: string, content: string): void {
    fs.mkdirSync(this.entriesDir, { recursive: true });
    fs.writeFileSync(this.entryPath(key), content);
    this.manifest.entries[key] = { inputHash };
    this.saveManifest();
  }
}
