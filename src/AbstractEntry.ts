import { AbstractFileSystem } from "./AbstractFileSystem";
import {
  CopyOptions,
  DeleteOptions,
  Directory,
  Entry,
  HeadOptions,
  MoveOptions,
  PatchOptions,
  Stats,
  URLOptions,
  XmitOptions,
} from "./core";
import {
  createError,
  FileSystemError,
  NoModificationAllowedError,
  NotFoundError,
  NotReadableError,
} from "./errors";
import { getParentPath } from "./util";

interface ErrorParams {
  e?: unknown;
  message?: string;

  [key: string]: any; // eslint-disable-line
}

export abstract class AbstractEntry implements Entry {
  private afterDelete?: (path: string) => Promise<void>;
  private beforeDelete?: (
    path: string,
    options: DeleteOptions
  ) => Promise<boolean>;

  constructor(
    public readonly fs: AbstractFileSystem,
    public readonly path: string
  ) {
    const hook = fs.options.hook;
    if (hook) {
      this.beforeDelete = hook?.beforeDelete;
      this.afterDelete = hook?.afterDelete;
    }
  }

  public async copy(to: Entry, options?: CopyOptions): Promise<void> {
    options = { force: false, recursive: false, ...options };
    await this._xmit(to, options);
  }

  public cp = (to: Entry, options?: CopyOptions | undefined) =>
    this.copy(to, options);

  public del = (options?: DeleteOptions | undefined) => this.delete(options);

  public async delete(options?: DeleteOptions): Promise<void> {
    try {
      options = { force: false, recursive: false, ...options };
      if (!options.ignoreHook && this.beforeDelete) {
        if (await this.beforeDelete(this.path, options)) {
          return;
        }
      }
      await this._delete(options);
      if (!options.ignoreHook && this.afterDelete) {
        await this.afterDelete(this.path);
      }
    } catch (e) {
      this._handleNoModificationAllowedError(options?.errors, { e });
    }
  }

  public async getParent(): Promise<Directory> {
    const parentPath = getParentPath(this.path);
    return this.fs.getDirectory(parentPath);
  }

  public async move(to: Entry, options?: MoveOptions): Promise<void> {
    options = { force: false, ...options };
    await this._xmit(to, {
      ...options,
      recursive: true,
    });

    const errors = options.errors;
    if (errors && errors.length === 0) {
      await this.delete({
        ...options,
        recursive: true,
      });
    }
  }

  public mv = (to: Entry, options?: MoveOptions | undefined) =>
    this.move(to, options);

  public patch = (props: Stats, options?: PatchOptions) =>
    this.fs.patch(this.path, props, options);

  public remove = (options?: DeleteOptions | undefined) => this.delete(options);

  public rm = (options?: DeleteOptions | undefined) => this.delete(options);

  public stat = (options?: HeadOptions | undefined) => this.head(options);

  public toString = () => `${this.fs.repository}:${this.path}`;

  public toURL = (options?: URLOptions) => this.fs.toURL(this.path, options);

  public abstract _delete(option: DeleteOptions): Promise<void>;
  public abstract _xmit(entry: Entry, options: XmitOptions): Promise<void>;
  public abstract head(options?: HeadOptions): Promise<Stats | null>;

  protected _handleError(
    name: string,
    errors?: FileSystemError[],
    params?: ErrorParams
  ) {
    const error = createError({
      name,
      repository: this.fs.repository,
      path: this.path,
      ...params,
    });
    this._handleFileSystemError(error, errors);
  }

  protected _handleFileSystemError(
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

  protected _handleNoModificationAllowedError(
    errors?: FileSystemError[],
    params?: ErrorParams
  ) {
    return this._handleError(NoModificationAllowedError.name, errors, params);
  }

  protected _handleNotFoundError(
    errors?: FileSystemError[],
    params?: ErrorParams
  ) {
    return this._handleError(NotFoundError.name, errors, params);
  }

  protected _handleNotReadableError(
    errors?: FileSystemError[],
    params?: ErrorParams
  ) {
    return this._handleError(NotReadableError.name, errors, params);
  }
}
