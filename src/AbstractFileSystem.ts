import { Source } from "univ-conv";
import { AbstractFile } from "./AbstractFile";
import {
  ReadOptions,
  CopyOptions,
  DeleteOptions,
  Directory,
  Entry,
  ErrorLike,
  File,
  FileSystem,
  FileSystemOptions,
  HeadOptions,
  ListOptions,
  MkcolOptions,
  MoveOptions,
  OpenOptions,
  PatchOptions,
  Props,
  Stats,
  URLType,
  WriteOptions,
} from "./core";
import { createError, NotFoundError } from "./errors";
import { normalizePath } from "./util";

export abstract class AbstractFileSystem implements FileSystem {
  private afterHead?: (path: string, stats: Stats) => Promise<void>;
  private afterPatch?: (path: string) => Promise<void>;
  private beforeHead?: (
    path: string,
    options: HeadOptions
  ) => Promise<Stats | null>;
  private beforePatch?: (
    path: string,
    props: Props,
    options: PatchOptions
  ) => Promise<boolean>;

  public cp = this.copy;
  public del = this.delete;
  public ls = this.list;
  public mkdir = this.mkcol;
  public mv = this.move;
  public readdir = this.list;
  public rm = this.delete;
  public stat = this.head;
  public unlink = this.delete;

  constructor(
    public readonly repository: string,
    public readonly options: FileSystemOptions = {}
  ) {
    const hook = options.hook;
    this.beforeHead = hook?.beforeHead;
    this.beforePatch = hook?.beforePatch;
    this.afterHead = hook?.afterHead;
    this.afterPatch = hook?.afterPatch;
  }

  public async copy(
    fromPath: string,
    toPath: string,
    options: CopyOptions = { force: false, recursive: false }
  ): Promise<ErrorLike[]> {
    const { from, to } = await this._prepareXmit(fromPath, toPath);
    return from.copy(to, options);
  }

  public async delete(
    path: string,
    options: DeleteOptions = { force: false, recursive: false }
  ): Promise<ErrorLike[]> {
    const entry = await this.getEntry(path);
    return entry.delete(options);
  }

  public async getEntry(path: string): Promise<Entry> {
    const stats = await this.head(path);
    return stats.size != null ? this.getFile(path) : this.getDirectory(path);
  }

  public async hash(path: string, options: OpenOptions = {}): Promise<string> {
    const file = await this.getFile(path);
    return file.hash(options);
  }

  public async head(path: string, options: HeadOptions = {}): Promise<Stats> {
    path = normalizePath(path);
    let stats: Stats | null | undefined;
    if (!options.ignoreHook && this.beforeHead) {
      stats = await this.beforeHead(path, options);
    }
    if (!stats) {
      stats = await this._head(path, options);
    }
    if (this.options.logicalDelete && stats.deleted != null) {
      throw createError({
        repository: this.repository,
        path,
        e: undefined,
        name: NotFoundError.name,
      });
    }
    if (!options.ignoreHook && this.afterHead) {
      await this.afterHead(path, stats);
    }
    return stats;
  }

  public async list(path: string, options?: ListOptions): Promise<string[]> {
    const dir = await this.getDirectory(path);
    return dir.list(options);
  }

  public async mkcol(path: string, options?: MkcolOptions): Promise<void> {
    const dir = await this.getDirectory(path);
    return dir.mkcol(options);
  }

  public async move(
    fromPath: string,
    toPath: string,
    options: MoveOptions = { force: false }
  ): Promise<ErrorLike[]> {
    const { from, to } = await this._prepareXmit(fromPath, toPath);
    return from.move(to, options);
  }

  public async patch(
    path: string,
    props: Props,
    options: PatchOptions = {}
  ): Promise<void> {
    path = normalizePath(path);
    if (this.beforePatch) {
      if (await this.beforePatch(path, props, options)) {
        return;
      }
    }
    const stats = await this.head(path, { ignoreHook: options.ignoreHook });
    props = { ...stats, ...props };
    await this._patch(path, props, options);
    if (this.afterPatch) {
      await this.afterPatch(path);
    }
  }

  public async read(path: string, options: ReadOptions = {}): Promise<Source> {
    const file = await this.getFile(path);
    return file.read(options);
  }

  public async write(
    path: string,
    source: Source,
    options?: WriteOptions
  ): Promise<void> {
    const file = await this.getFile(path);
    return file.write(source, options);
  }

  public abstract _head(path: string, options: HeadOptions): Promise<Stats>;
  public abstract _patch(
    path: string,
    props: Props,
    options: PatchOptions
  ): Promise<void>;
  /**
   * Get a directory.
   * @param path A path to a directory.
   * @param options
   */
  public abstract getDirectory(path: string): Promise<Directory>;
  /**
   * Get a file.
   * @param path A path to a file.
   * @param options
   */
  public abstract getFile(path: string): Promise<File>;
  public abstract toURL(path: string, urlType?: URLType): Promise<string>;

  private async _prepareXmit(fromPath: string, toPath: string) {
    const from = await this.getEntry(fromPath);
    const to = await (from instanceof AbstractFile
      ? this.getFile(toPath)
      : this.getDirectory(toPath));
    return { from, to };
  }
}
