import { Data, DataType, ReturnData } from "univ-conv";
import { AbstractFile } from "./AbstractFile";
import {
  CopyOptions,
  DeleteOptions,
  Directory,
  Entry,
  EntryType,
  ErrorLike,
  File,
  FileSystem,
  FileSystemOptions,
  HeadOptions,
  ListOptions,
  MkcolOptions,
  MoveOptions,
  PatchOptions,
  ReadOptions,
  Stats,
  URLOptions,
  WriteOptions,
} from "./core";
import { createError, NotFoundError, TypeMismatchError } from "./errors";
import { INVALID_CHARS, normalizePath } from "./util";

export abstract class AbstractFileSystem implements FileSystem {
  private afterHead?: (path: string, stats: Stats) => Promise<void>;
  private afterPatch?: (path: string) => Promise<void>;
  private beforeHead?: (
    path: string,
    options: HeadOptions
  ) => Promise<Stats | null>;
  private beforePatch?: (
    path: string,
    props: Stats,
    options: PatchOptions
  ) => Promise<boolean>;

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
    options?: CopyOptions
  ): Promise<ErrorLike[]> {
    options = { force: false, recursive: false, ...options };
    const { from, to } = await this._prepareXmit(fromPath, toPath);
    return from.copy(to, options);
  }

  public cp = (
    fromPath: string,
    toPath: string,
    options?: CopyOptions | undefined
  ) => this.copy(fromPath, toPath, options);

  public del = (path: string, options?: DeleteOptions | undefined) =>
    this.delete(path, options);

  public async delete(
    path: string,
    options?: DeleteOptions
  ): Promise<ErrorLike[]> {
    options = { force: false, recursive: false, ...options };
    const entry = await this.getEntry(path, options);
    return entry.delete(options);
  }

  public dir = (path: string, options?: ListOptions | undefined) =>
    this.list(path, options);

  public getDirectory(path: string): Promise<Directory> {
    path = this._checkPath(path);
    return this._getDirectory(path);
  }

  public async getEntry(path: string, options?: HeadOptions): Promise<Entry> {
    options = { ...options };

    if (path.endsWith("/")) {
      if (!options.type) {
        options.type = EntryType.Directory;
      }
    }

    if (options.type === EntryType.File) {
      return this.getFile(path);
    }
    if (options.type === EntryType.Directory) {
      return this.getDirectory(path);
    }

    const stats = await this.head(path, options);
    return stats.size != null ? this.getFile(path) : this.getDirectory(path);
  }

  public getFile(path: string): Promise<File> {
    path = this._checkPath(path);
    return this._getFile(path);
  }

  public async hash(path: string, options?: ReadOptions): Promise<string> {
    const file = await this.getFile(path);
    return file.hash(options);
  }

  public async head(path: string, options?: HeadOptions): Promise<Stats> {
    options = { ...options };

    if (path.endsWith("/")) {
      if (!options.type) {
        options.type = EntryType.Directory;
      }
    }
    path = this._checkPath(path);

    if (options.type === EntryType.Directory) {
      if (!this.supportDirectory()) {
        return {};
      }
    }

    let stats: Stats | null | undefined;
    if (!options.ignoreHook && this.beforeHead) {
      stats = await this.beforeHead(path, options);
    }
    if (!stats) {
      stats = await this._head(path, options);
    }
    if (stats.size != null && options.type === EntryType.Directory) {
      throw createError({
        name: TypeMismatchError.name,
        repository: this.repository,
        path,
        e: { message: `"${path}" is not a directory` },
      });
    }
    if (stats.size == null && options.type === EntryType.File) {
      throw createError({
        name: TypeMismatchError.name,
        repository: this.repository,
        path,
        e: { message: `"${path}" is not a file` },
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

  public ls = (path: string, options?: ListOptions | undefined) =>
    this.list(path, options);

  public async mkcol(path: string, options?: MkcolOptions): Promise<boolean> {
    const dir = await this.getDirectory(path);
    return dir.mkcol(options);
  }

  public mkdir = (path: string, options?: MkcolOptions | undefined) =>
    this.mkcol(path, options);

  public async move(
    fromPath: string,
    toPath: string,
    options?: MoveOptions
  ): Promise<ErrorLike[]> {
    options = { force: false, ...options };
    const { from, to } = await this._prepareXmit(fromPath, toPath);
    return from.move(to, options);
  }

  public mv = (
    fromPath: string,
    toPath: string,
    options?: MoveOptions | undefined
  ) => this.move(fromPath, toPath, options);

  public async patch(
    path: string,
    props: Stats,
    options?: PatchOptions
  ): Promise<void> {
    options = { ...options };

    if (path.endsWith("/")) {
      if (!options.type) {
        options.type = EntryType.Directory;
      }
    }
    path = this._checkPath(path);

    const stats = await this.head(path, options);
    this._fixProps(path, props, stats);
    if (this.beforePatch) {
      if (await this.beforePatch(path, props, options)) {
        return;
      }
    }
    await this._patch(path, stats, props, options);
    if (this.afterPatch) {
      await this.afterPatch(path);
    }
  }

  public async read<T extends DataType>(
    path: string,
    type: T,
    options?: ReadOptions
  ): Promise<ReturnData<T>> {
    const file = await this.getFile(path);
    return file.read(type, options);
  }

  public readdir = (path: string, options?: ListOptions | undefined) =>
    this.list(path, options);

  public rm = (path: string, options?: DeleteOptions | undefined) =>
    this.delete(path, options);

  public stat = (path: string, options?: HeadOptions | undefined) =>
    this.head(path, options);

  public async toURL(path: string, options?: URLOptions): Promise<string> {
    const stats = await this.head(path);
    return this._toURL(path, stats.size == null, options);
  }

  public unlink = (path: string, options?: DeleteOptions | undefined) =>
    this.delete(path, options);

  public async write(
    path: string,
    data: Data,
    options?: WriteOptions
  ): Promise<void> {
    const file = await this.getFile(path);
    return file.write(data, options);
  }

  public abstract _getDirectory(path: string): Promise<Directory>;
  public abstract _getFile(path: string): Promise<File>;
  public abstract _head(path: string, options: HeadOptions): Promise<Stats>;
  public abstract _patch(
    path: string,
    stats: Stats,
    props: Stats,
    options: PatchOptions
  ): Promise<void>;
  public abstract _toURL(
    path: string,
    isDirectory: boolean,
    options?: URLOptions
  ): Promise<string>;
  public abstract canPatchAccessed(): boolean;
  public abstract canPatchCreated(): boolean;
  public abstract canPatchModified(): boolean;
  public abstract supportDirectory(): boolean;
  public abstract supportRangeRead(): boolean;
  public abstract supportRangeWrite(): boolean;

  protected _checkPath(path: string) {
    if (INVALID_CHARS.test(path)) {
      throw createError({
        name: SyntaxError.name,
        repository: this.repository,
        path,
        e: { message: `"${path}" has invalid character` },
      });
    }
    return normalizePath(path);
  }

  protected _fixProps(path: string, props: Stats, stats: Stats) {
    if (props.size != null) {
      console.warn(`Cannot change size: ${path}`);
      delete props.size; // Cannot change size
    }
    if (props.etag != null) {
      console.warn(`Cannot change etag: ${path}`);
      delete props.etag;
    }
    if (this.canPatchAccessed()) {
      if (typeof props.accessed !== "number") {
        console.warn(`Access time (${props.accessed}) is illegal: ${path}`); // eslint-disable-line
        delete props.accessed;
      }
    } else {
      console.warn(
        `Cannot patch access time on the FileSystem: ${this.constructor.name}`
      ); // eslint-disable-line
      delete props.accessed;
    }
    if (this.canPatchCreated()) {
      if (typeof props.created !== "number") {
        console.warn(`Creation time (${props.created}) is illegal: ${path}`); // eslint-disable-line
        delete props.created;
      }
    } else {
      console.warn(
        `Cannot patch creation time on the FileSystem: ${this.constructor.name}`
      ); // eslint-disable-line
      delete props.created;
    }
    if (this.canPatchModified()) {
      if (typeof props.modified !== "number") {
        console.warn(
          `Modification time (${props.modified}) is illegal: ${path}` // eslint-disable-line
        );
        delete props.modified;
      }
    } else {
      console.warn(
        `Cannot patch modification time on the FileSystem: ${this.constructor.name}`
      ); // eslint-disable-line
      delete props.modified;
    }
    for (const key of Object.keys(stats)) {
      if (stats[key] === props[key]) {
        delete props[key]; // Not changed
      } else if (
        typeof stats[key] !== typeof props[key] &&
        typeof props[key] !== "undefined"
      ) {
        console.warn(`Illetal type stats[${key}]: ${props[key]}`); // eslint-disable-line
        delete props[key];
      }
    }
  }

  private async _prepareXmit(fromPath: string, toPath: string) {
    let from: Entry;
    try {
      from = await this.getEntry(fromPath);
    } catch (e) {
      if ((e as ErrorLike).name === NotFoundError.name) {
        if (this.supportDirectory()) {
          from = await this.getDirectory(fromPath);
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }
    const to = await (from instanceof AbstractFile
      ? this.getFile(toPath)
      : this.getDirectory(toPath));
    return { from, to };
  }
}
