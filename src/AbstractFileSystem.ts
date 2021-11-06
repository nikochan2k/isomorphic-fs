import { Data, DataType, ReturnDataType } from "univ-conv";
import { createError, INVALID_CHARS, TypeMismatchError } from ".";
import { AbstractFile } from "./AbstractFile";
import {
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
  ReadOptions,
  Stats,
  URLOptions,
  WriteOptions,
} from "./core";
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

  public _checkPath(path: string) {
    if (INVALID_CHARS.test(path)) {
      throw createError({
        name: SyntaxError.name,
        repository: this.repository,
        path,
        e: { message: `"${path}" has invalid character` },
      });
    }
  }

  public _fixProps(props: Props, stats: Stats) {
    if (props["size"]) {
      delete props["size"];
    }
    if (props["etag"]) {
      delete props["etag"];
    }
    if (!props["accessed"] && stats.accessed) {
      props["accessed"] = stats.accessed;
    }
    if (!props["created"] && stats.created) {
      props["created"] = stats.created;
    }
    if (!props["modified"] && stats.modified) {
      props["modified"] = stats.modified;
    }
  }

  public async copy(
    fromPath: string,
    toPath: string,
    options?: CopyOptions
  ): Promise<ErrorLike[]> {
    this._checkPath(fromPath);
    this._checkPath(toPath);
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
    this._checkPath(path);
    options = { force: false, recursive: false, ...options };
    const entry = await this.getEntry(path, options);
    return entry.delete(options);
  }

  public getDirectory(path: string): Promise<Directory> {
    this._checkPath(path);
    return this._getDirectory(path);
  }

  public async getEntry(path: string, options?: HeadOptions): Promise<Entry> {
    this._checkPath(path);
    options = { ...options };
    if (!options.type && path.endsWith("/")) {
      options.type = "directory";
    }

    if (options.type === "file") {
      return this.getFile(path);
    }
    if (options.type === "directory") {
      return this.getDirectory(path);
    }

    const stats = await this.head(path, options);
    return stats.size != null ? this.getFile(path) : this.getDirectory(path);
  }

  public getFile(path: string): Promise<File> {
    this._checkPath(path);
    if (path.endsWith("/")) {
      throw createError({
        name: TypeMismatchError.name,
        repository: this.repository,
        path,
        e: { message: `"${path}" must not end with slash` },
      });
    }

    return this._getFile(path);
  }

  public async hash(path: string, options?: OpenOptions): Promise<string> {
    this._checkPath(path);
    const file = await this.getFile(path);
    return file.hash(options);
  }

  public async head(path: string, options?: HeadOptions): Promise<Stats> {
    this._checkPath(path);
    options = { ...options };
    if (path.endsWith("/")) {
      if (options.type === "file") {
        throw createError({
          name: TypeMismatchError.name,
          repository: this.repository,
          path,
          e: {
            message: `"options.type" is file, but "${path}" ends with slash`,
          },
        });
      }
      options.type = "directory";
    }
    path = normalizePath(path);
    let stats: Stats | null | undefined;
    if (!options.ignoreHook && this.beforeHead) {
      stats = await this.beforeHead(path, options);
    }
    if (!stats) {
      stats = await this._head(path, options);
    }
    if (!options.ignoreHook && this.afterHead) {
      await this.afterHead(path, stats);
    }
    return stats;
  }

  public async list(path: string, options?: ListOptions): Promise<string[]> {
    this._checkPath(path);
    const dir = await this.getDirectory(path);
    return dir.list(options);
  }

  public ls = (path: string, options?: ListOptions | undefined) =>
    this.list(path, options);

  public async mkcol(path: string, options?: MkcolOptions): Promise<void> {
    this._checkPath(path);
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
    this._checkPath(fromPath);
    this._checkPath(toPath);
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
    props: Props,
    options?: PatchOptions
  ): Promise<void> {
    this._checkPath(path);
    options = { ...options };
    const stats = await this.head(path, options);
    this._fixProps(props, stats);
    path = normalizePath(path);
    if (this.beforePatch) {
      if (await this.beforePatch(path, props, options)) {
        return;
      }
    }
    await this._patch(path, props, options);
    if (this.afterPatch) {
      await this.afterPatch(path);
    }
  }

  public async read<T extends DataType>(
    path: string,
    options?: ReadOptions<T>
  ): Promise<ReturnDataType<T>> {
    this._checkPath(path);
    const file = await this.getFile(path);
    return file.read(options);
  }

  public readdir = (path: string, options?: ListOptions | undefined) =>
    this.list(path, options);

  public rm = (path: string, options?: DeleteOptions | undefined) =>
    this.delete(path, options);

  public stat = (path: string, options?: HeadOptions | undefined) =>
    this.head(path, options);

  public async toURL(path: string, options?: URLOptions): Promise<string> {
    this._checkPath(path);
    const stats = await this.stat(path);
    if (stats.size == null) {
      throw createError({
        name: TypeMismatchError.name,
        repository: this.repository,
        path,
        e: { message: `"${path}" is not a file` },
      });
    }
    return this._toURL(path, options);
  }

  public unlink = (path: string, options?: DeleteOptions | undefined) =>
    this.delete(path, options);

  public async write(
    path: string,
    data: Data,
    options?: WriteOptions
  ): Promise<void> {
    this._checkPath(path);
    const file = await this.getFile(path);
    return file.write(data, options);
  }

  public abstract _getDirectory(path: string): Promise<Directory>;
  public abstract _getFile(path: string): Promise<File>;
  public abstract _head(path: string, options: HeadOptions): Promise<Stats>;
  public abstract _patch(
    path: string,
    props: Props,
    options: PatchOptions
  ): Promise<void>;
  public abstract _toURL(path: string, options?: URLOptions): Promise<string>;

  private async _prepareXmit(fromPath: string, toPath: string) {
    const from = await this.getEntry(fromPath);
    const to = await (from instanceof AbstractFile
      ? this.getFile(toPath)
      : this.getDirectory(toPath));
    return { from, to };
  }
}
