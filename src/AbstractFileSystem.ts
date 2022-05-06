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
  OnExists,
  OnNoParent,
  OnNotExist,
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
  isFileSystemError,
  NoModificationAllowedError,
  NotFoundError,
  NotReadableError,
  TypeMismatchError,
} from "./errors";
import { INVALID_CHARS, normalizePath } from "./util";

export interface ErrorParams {
  e?: unknown;
  message?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export abstract class AbstractFileSystem implements FileSystem {
  public readonly defaultCopyOptions: CopyOptions;
  public readonly defaultDeleteOptions: DeleteOptions;
  public readonly defaultMkdirOptions: MkcolOptions;
  public readonly defaultMoveOptions: MoveOptions;

  constructor(
    public readonly repository: string,
    public readonly options: FileSystemOptions = {}
  ) {
    this.defaultDeleteOptions = options.defaultDeleteOptions ?? {
      onNotExist: OnNotExist.Error,
      recursive: false,
    };
    this.defaultMkdirOptions = options.defaultMkdirOptions ?? {
      onExists: OnExists.Error,
      onNoParent: OnNoParent.Error,
    };
    this.defaultMoveOptions = options.defaultMoveOptions ?? {
      onExists: OnExists.Error,
      onNoParent: OnNoParent.Error,
    };
    this.defaultCopyOptions = options.defaultCopyOptions ?? {
      onExists: OnExists.Error,
      onNoParent: OnNoParent.Error,
      recursive: false,
    };
  }

  public async _handleError(
    name: string,
    path: string,
    errors?: FileSystemError[],
    params?: ErrorParams,
    callback?: (error: FileSystemError) => Promise<void>
  ) {
    const error = createError({
      name,
      repository: this.repository,
      path: path,
      ...params,
    });
    await this._handleFileSystemError(error, errors, callback);
  }

  public async _handleFileSystemError(
    error: FileSystemError,
    errors?: FileSystemError[],
    callback?: (error: FileSystemError) => Promise<void>
  ) {
    if (callback) {
      await callback(error);
    }
    if (errors) {
      errors.push(error);
      return;
    } else {
      throw error;
    }
  }

  public async copy(
    fromPath: string,
    toPath: string,
    options?: CopyOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    options = {
      onExists: OnExists.Error,
      onNoParent: OnNoParent.Error,
      recursive: false,
      ...options,
    };
    try {
      // eslint-disable-next-line no-var
      var { from, to } = await this._prepareCopy(fromPath, toPath, options);
    } catch (e) {
      if (errors) {
        errors.push(e as FileSystemError);
        return false;
      }
      throw e;
    }
    return from.copy(to, options, errors);
  }

  public cp = (
    fromPath: string,
    toPath: string,
    options?: CopyOptions,
    errors?: FileSystemError[]
  ) => this.copy(fromPath, toPath, options, errors);

  public del = (
    path: string,
    options?: DeleteOptions,
    errors?: FileSystemError[]
  ) => this.delete(path, options, errors);

  public async delete(
    path: string,
    options?: DeleteOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    const entry = await this.getEntry(path, options, errors);
    if (!entry) {
      return false;
    }
    return entry.delete(options);
  }

  public dir(path: string, options?: ListOptions): Promise<string[]>;
  public dir(
    path: string,
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  public dir(
    path: string,
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null> {
    return this.list(path, options, errors);
  }

  public getDirectory(path: string): Promise<Directory>;
  public getDirectory(
    path: string,
    errors?: FileSystemError[]
  ): Promise<Directory | null>;
  public async getDirectory(
    path: string,
    errors?: FileSystemError[]
  ): Promise<Directory | null> {
    const checked = await this._checkPath(path, errors);
    if (!checked) {
      return null;
    }
    return this._doGetDirectory(checked);
  }

  public async getEntry(path: string, options?: HeadOptions): Promise<Entry>;
  public async getEntry(
    path: string,
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Entry | null>;
  public async getEntry(
    path: string,
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Entry | null> {
    options = { ...options };

    if (path.endsWith("/")) {
      if (!options.type) {
        options.type = EntryType.Directory;
      }
    }

    if (options.type === EntryType.File) {
      return this.getFile(path, errors);
    }
    if (options.type === EntryType.Directory) {
      return this.getDirectory(path, errors);
    }

    const stats = await this.head(path, options);
    return stats.size != null ? this.getFile(path) : this.getDirectory(path);
  }

  public getFile(path: string): Promise<File>;
  public getFile(
    path: string,
    errors?: FileSystemError[]
  ): Promise<File | null>;
  public async getFile(
    path: string,
    errors?: FileSystemError[]
  ): Promise<File | null> {
    const checked = await this._checkPath(path, errors);
    if (checked == null) {
      return null;
    }
    return this._doGetFile(checked);
  }

  public async hash(path: string, options?: ReadOptions): Promise<string>;
  public async hash(
    path: string,
    options?: ReadOptions,
    errors?: FileSystemError[]
  ): Promise<string | null>;
  public async hash(
    path: string,
    options?: ReadOptions,
    errors?: FileSystemError[]
  ): Promise<string | null> {
    const file = await this.getFile(path, errors);
    if (file == null) {
      return null;
    }
    return file.hash(options, errors);
  }

  public async head(path: string, options?: HeadOptions): Promise<Stats>;
  public async head(
    path: string,
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null>;
  public async head(
    path: string,
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null> {
    options = { ...options };

    if (!options.type) {
      if (path.endsWith("/")) {
        options.type = EntryType.Directory;
      }
    }
    const checked = await this._checkPath(path, errors);
    if (!checked) {
      return null;
    }
    path = checked;

    try {
      let stats = await this._beforeHead(path, options);
      if (stats) {
        return stats;
      }

      if (options.type === EntryType.Directory) {
        if (!this.supportDirectory()) {
          return {};
        }
      }

      stats = await this._doHead(path, options);
      if (stats.size != null && options.type === EntryType.Directory) {
        throw createError({
          name: TypeMismatchError.name,
          repository: this.repository,
          path: path,
          message: `"${path}" is not a directory`,
        });
      }
      if (stats.size == null && options.type === EntryType.File) {
        throw createError({
          name: TypeMismatchError.name,
          repository: this.repository,
          path: path,
          message: `"${path}" is not a file`,
        });
      }

      await this._afterHead(path, stats, options);

      return stats;
    } catch (e) {
      const opts = options;
      await this._handleError(
        NotReadableError.name,
        path,
        errors,
        { e },
        async (error) => {
          await this._afterHead(path, null, opts, error);
        }
      );
      return null;
    }
  }

  public async list(path: string, options?: ListOptions): Promise<string[]>;
  public async list(
    path: string,
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  public async list(
    path: string,
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null> {
    const dir = await this.getDirectory(path, errors);
    if (!dir) {
      return Promise.resolve([]);
    }
    return dir.list(options, errors);
  }

  public ls(path: string, options?: ListOptions): Promise<string[]>;
  public ls(
    path: string,
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null> {
    return this.list(path, options, errors);
  }

  public async mkcol(
    path: string,
    options?: MkcolOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    const dir = await this.getDirectory(path, errors);
    if (!dir) {
      return false;
    }
    return dir.mkcol(options, errors);
  }

  public mkdir = (
    path: string,
    options?: MkcolOptions,
    errors?: FileSystemError[]
  ) => this.mkcol(path, options, errors);

  public async move(
    fromPath: string,
    toPath: string,
    options?: MoveOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    options = {
      onExists: OnExists.Error,
      onNoParent: OnNoParent.Error,
      ...options,
    };
    try {
      // eslint-disable-next-line no-var
      var { from, to } = await this._prepareCopy(fromPath, toPath, options);
    } catch (e) {
      if (errors) {
        errors.push(e as FileSystemError);
        return false;
      }
      throw e;
    }
    return from.move(to, options, errors);
  }

  public mv = (
    fromPath: string,
    toPath: string,
    options?: MoveOptions,
    errors?: FileSystemError[]
  ) => this.move(fromPath, toPath, options, errors);

  public async patch(
    path: string,
    props: Stats,
    options?: PatchOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    const checked = await this._checkPath(path, errors);
    if (!checked) {
      return false;
    }
    path = checked;

    options = { ...options };
    if (path.endsWith("/")) {
      if (!options.type) {
        options.type = EntryType.Directory;
      }
    }

    const stats = await this.head(path, options);
    if (!stats) {
      return false;
    }
    this._fixProps(path, props, stats);

    try {
      const result = await this._beforePatch(path, props, options);
      if (result != null) {
        return result;
      }
      await this._doPatch(path, stats, props, options);
      await this._afterPatch(path, true, options);
      return true;
    } catch (e) {
      const opts = options;
      await this._handleError(
        NoModificationAllowedError.name,
        path,
        errors,
        { e },
        async (errors) => {
          await this._afterPatch(path, false, opts, errors);
        }
      );
      return false;
    }
  }

  public async read<T extends DataType>(
    path: string,
    type?: T,
    options?: ReadOptions
  ): Promise<ReturnData<T>>;
  public async read<T extends DataType>(
    path: string,
    type?: T,
    options?: ReadOptions,
    errors?: FileSystemError[]
  ): Promise<ReturnData<T> | null> {
    const file = await this.getFile(path, errors);
    if (!file) {
      return null;
    }
    return file.read(type, options, errors);
  }

  public readdir(
    path: string,
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[]>;
  public readdir(
    path: string,
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null> {
    return this.list(path, options, errors);
  }

  public rm = (
    path: string,
    options?: DeleteOptions,
    errors?: FileSystemError[]
  ) => this.delete(path, options, errors);

  public stat(path: string, options?: HeadOptions): Promise<Stats>;
  public stat(
    path: string,
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null>;
  public stat(
    path: string,
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null> {
    return this.head(path, options, errors);
  }

  public async toURL(path: string, options?: URLOptions): Promise<string>;
  public async toURL(
    path: string,
    options?: URLOptions,
    errors?: FileSystemError[]
  ): Promise<string | null>;
  public async toURL(
    path: string,
    options?: URLOptions,
    errors?: FileSystemError[]
  ): Promise<string | null> {
    const stats = await this.head(path, options, errors);
    if (stats == null) {
      return null;
    }
    return this._doToURL(path, stats.size == null, options);
  }

  public unlink = (path: string, options?: DeleteOptions) =>
    this.delete(path, options);

  public async write(
    path: string,
    data: Data,
    options?: WriteOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    const file = await this.getFile(path, errors);
    if (!file) {
      return false;
    }
    return file.write(data, options, errors);
  }

  public abstract _doGetDirectory(path: string): Promise<Directory>;
  public abstract _doGetFile(path: string): Promise<File>;
  public abstract _doHead(path: string, options: HeadOptions): Promise<Stats>;
  public abstract _doPatch(
    path: string,
    stats: Stats,
    props: Stats,
    options: PatchOptions
  ): Promise<void>;
  public abstract _doToURL(
    path: string,
    isDirectory: boolean,
    options?: URLOptions
  ): Promise<string>;
  public abstract canPatchAccessed(): boolean;
  public abstract canPatchCreated(): boolean;
  public abstract canPatchModified(): boolean;
  public abstract supportDirectory(): boolean;

  protected async _afterHead(
    path: string,
    stats: Stats | null,
    options: HeadOptions,
    error?: FileSystemError
  ) {
    const afterHead = this.options.hook?.afterHead;
    if (afterHead && !options.ignoreHook) {
      await afterHead(this.repository, path, options, stats, error);
    }
  }

  protected async _afterPatch(
    path: string,
    result: boolean,
    options: PatchOptions,
    error?: FileSystemError
  ) {
    const afterPatch = this.options.hook?.afterPatch;
    if (afterPatch && !options.ignoreHook) {
      await afterPatch(this.repository, path, options, result, error);
    }
  }

  protected async _beforeHead(path: string, options: HeadOptions) {
    const beforeHead = this.options.hook?.beforeHead;
    if (beforeHead && !options?.ignoreHook) {
      return beforeHead(this.repository, path, options);
    }
    return null;
  }

  protected async _beforePatch(
    path: string,
    props: Stats,
    options: PatchOptions
  ) {
    const beforePatch = this.options.hook?.beforePatch;
    if (beforePatch && !options.ignoreHook) {
      return beforePatch(this.repository, path, props, options);
    }
    return null;
  }

  protected _checkPath(path: string): Promise<string>;
  protected _checkPath(
    path: string,
    errors?: FileSystemError[]
  ): Promise<string | null>;
  protected async _checkPath(
    path: string,
    errors?: FileSystemError[]
  ): Promise<string | null> {
    if (INVALID_CHARS.test(path)) {
      await this._handleError(SyntaxError.name, path, errors, {
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

  private async _prepareCopy(
    fromPath: string,
    toPath: string,
    options?: Options
  ): Promise<{ from: Entry; to: Entry }> {
    let from: Entry;
    try {
      from = await this.getEntry(fromPath, options);
    } catch (e) {
      if (isFileSystemError(e) && e.name === NotFoundError.name) {
        if (!this.supportDirectory()) {
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
