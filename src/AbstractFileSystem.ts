import { Data, DataType, ReturnData } from "univ-conv";
import { AbstractFile } from "./AbstractFile";
import {
  CopyOptions,
  DeleteOptions,
  Directory,
  Entry,
  EntryType,
  File,
  FileSystem,
  FileSystemOptions,
  HeadOptions,
  ListOptions,
  MkcolOptions,
  MoveOptions,
  Options,
  PatchOptions,
  ReadOptions,
  Stats,
  URLOptions,
  WriteOptions,
} from "./core";
import {
  createError,
  FileSystemError,
  NoModificationAllowedError,
  NotReadableError,
  TypeMismatchError,
} from "./errors";
import { INVALID_CHARS, normalizePath } from "./util";

export interface ErrorParams {
  e?: unknown;
  message?: string;

  [key: string]: any; // eslint-disable-line
}

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
  ) => Promise<boolean | null>;

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
  ): Promise<boolean> {
    options = { force: false, recursive: false, ...options };
    const result = await this._prepareXmit(fromPath, toPath);
    if (!result) {
      return false;
    }
    const { from, to } = result;
    return from.copy(to, options);
  }

  public cp = (
    fromPath: string,
    toPath: string,
    options?: CopyOptions | undefined
  ) => this.copy(fromPath, toPath, options);

  public del = (path: string, options?: DeleteOptions | undefined) =>
    this.delete(path, options);

  public async delete(path: string, options?: DeleteOptions): Promise<boolean> {
    options = { force: false, recursive: false, ...options };
    const entry = await this.getEntry(path, options);
    if (!entry) {
      return false;
    }
    return entry.delete(options);
  }

  public dir = (path: string, options?: ListOptions | undefined) =>
    this.list(path, options);

  public getDirectory(
    path: string,
    options?: Options
  ): Promise<Directory | null> {
    const checked = this._checkPath(path, options);
    if (!checked) {
      return Promise.resolve(null);
    }
    return this._getDirectory(checked);
  }

  public async getEntry(
    path: string,
    options?: HeadOptions
  ): Promise<Entry | null> {
    options = { ...options };

    if (path.endsWith("/")) {
      if (!options.type) {
        options.type = EntryType.Directory;
      }
    }

    if (options.type === EntryType.File) {
      return this.getFile(path, options);
    }
    if (options.type === EntryType.Directory) {
      return this.getDirectory(path, options);
    }

    const stats = await this.head(path, options);
    if (!stats) {
      return null;
    }
    return stats.size != null ? this.getFile(path) : this.getDirectory(path);
  }

  public getFile(path: string, options?: Options): Promise<File | null> {
    const checked = this._checkPath(path, options);
    if (checked == null) {
      return Promise.resolve(null);
    }
    return this._getFile(checked);
  }

  public async hash(
    path: string,
    options?: ReadOptions
  ): Promise<string | null> {
    const file = await this.getFile(path);
    if (file == null) {
      return null;
    }
    return file.hash(options);
  }

  public _handleError(
    name: string,
    path: string,
    errors?: FileSystemError[],
    params?: ErrorParams
  ) {
    const error = createError({
      name,
      repository: this.repository,
      path: path,
      ...params,
    });
    this._handleFileSystemError(error, errors);
  }

  public _handleFileSystemError(
    error: FileSystemError,
    errors?: FileSystemError[]
  ) {
    if (errors) {
      errors.push(error);
      return;
    } else {
      throw error;
    }
  }

  public async head(
    path: string,
    options?: HeadOptions
  ): Promise<Stats | null> {
    try {
      options = { ...options };

      if (!options.type) {
        if (path.endsWith("/")) {
          options.type = EntryType.Directory;
        }
      }
      const checked = this._checkPath(path, options);
      if (checked == null) {
        return null;
      }

      if (options.type === EntryType.Directory) {
        if (!this.supportDirectory()) {
          return {};
        }
      }

      let stats: Stats | null | undefined;
      if (!options.ignoreHook && this.beforeHead) {
        stats = await this.beforeHead(checked, options);
      }
      if (!stats) {
        stats = await this._head(checked, options);
      }
      if (stats.size != null && options.type === EntryType.Directory) {
        throw createError({
          name: TypeMismatchError.name,
          repository: this.repository,
          path: checked,
          message: `"${checked}" is not a directory`,
        });
      }
      if (stats.size == null && options.type === EntryType.File) {
        throw createError({
          name: TypeMismatchError.name,
          repository: this.repository,
          path: checked,
          message: `"${checked}" is not a file`,
        });
      }
      if (!options.ignoreHook && this.afterHead) {
        await this.afterHead(checked, stats);
      }

      return stats;
    } catch (e) {
      throw createError({
        name: NotReadableError.name,
        repository: this.repository,
        path,
        e,
      });
    }
  }

  public async list(
    path: string,
    options?: ListOptions
  ): Promise<string[] | null> {
    const dir = await this.getDirectory(path, options);
    if (!dir) {
      return Promise.resolve([]);
    }
    return dir.list(options);
  }

  public ls = (path: string, options?: ListOptions | undefined) =>
    this.list(path, options);

  public async mkcol(path: string, options?: MkcolOptions): Promise<boolean> {
    const dir = await this.getDirectory(path, options);
    if (!dir) {
      return false;
    }
    return dir.mkcol(options);
  }

  public mkdir = (path: string, options?: MkcolOptions | undefined) =>
    this.mkcol(path, options);

  public async move(
    fromPath: string,
    toPath: string,
    options?: MoveOptions
  ): Promise<boolean> {
    options = { force: false, ...options };
    const result = await this._prepareXmit(fromPath, toPath);
    if (!result) {
      return false;
    }
    const { from, to } = result;
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
  ): Promise<boolean> {
    options = { ...options };

    if (path.endsWith("/")) {
      if (!options.type) {
        options.type = EntryType.Directory;
      }
    }
    const checked = this._checkPath(path, options);
    if (checked == null) {
      return false;
    }

    try {
      const stats = await this.head(checked, options);
      if (!stats) {
        return false;
      }
      this._fixProps(checked, props, stats);
      if (this.beforePatch) {
        const result = await this.beforePatch(checked, props, options);
        if (result != null) {
          return result;
        }
      }
      await this._patch(checked, stats, props, options);
      if (this.afterPatch) {
        await this.afterPatch(checked);
      }
      return true;
    } catch (e) {
      this._handleError(
        NoModificationAllowedError.name,
        checked,
        options?.errors,
        { e }
      );
      return false;
    }
  }

  public async read<T extends DataType>(
    path: string,
    type?: T,
    options?: ReadOptions
  ): Promise<ReturnData<T> | null> {
    const file = await this.getFile(path, options);
    if (!file) {
      return null;
    }
    return file.read(type, options);
  }

  public readdir = (path: string, options?: ListOptions | undefined) =>
    this.list(path, options);

  public rm = (path: string, options?: DeleteOptions | undefined) =>
    this.delete(path, options);

  public stat = (path: string, options?: HeadOptions | undefined) =>
    this.head(path, options);

  public async toURL(
    path: string,
    options?: URLOptions
  ): Promise<string | null> {
    const stats = await this.head(path);
    if (stats == null) {
      return null;
    }
    return this._toURL(path, stats.size == null, options);
  }

  public unlink = (path: string, options?: DeleteOptions | undefined) =>
    this.delete(path, options);

  public async write(
    path: string,
    data: Data,
    options?: WriteOptions
  ): Promise<boolean> {
    const file = await this.getFile(path);
    if (!file) {
      return false;
    }
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

  protected _checkPath(path: string, options?: Options): string | null {
    if (INVALID_CHARS.test(path)) {
      this._handleError(SyntaxError.name, path, options?.errors, {
        message: `"${path}" has invalid character`,
      });
      return null;
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
    const from = await this.getEntry(fromPath);
    if (!from) {
      return null;
    }
    const to = await (from instanceof AbstractFile
      ? this.getFile(toPath)
      : this.getDirectory(toPath));
    if (!to) {
      return null;
    }
    return { from, to };
  }
}
