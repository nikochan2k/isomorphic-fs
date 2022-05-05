import { ErrorParams } from ".";
import { AbstractFileSystem } from "./AbstractFileSystem";
import {
  CopyOptions,
  DeleteOptions,
  Directory,
  Entry,
  HeadOptions,
  MoveOptions,
  Options,
  PatchOptions,
  Stats,
  URLOptions,
  XmitOptions,
} from "./core";
import {
  FileSystemError,
  NoModificationAllowedError,
  NotFoundError,
  NotReadableError,
} from "./errors";
import { getParentPath } from "./util";

export abstract class AbstractEntry implements Entry {
  private readonly afterDelete?: (path: string) => Promise<void>;
  private readonly beforeDelete?: (
    path: string,
    options: DeleteOptions
  ) => Promise<boolean | null>;

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

  public async copy(
    to: Entry,
    options?: CopyOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    options = { ...this.fs.defaultCopyOptions, ...options };
    return this._xmit(to, options, errors);
  }

  public cp = (to: Entry, options?: CopyOptions, errors?: FileSystemError[]) =>
    this.copy(to, options, errors);

  public del = (options?: DeleteOptions, errors?: FileSystemError[]) =>
    this.delete(options, errors);

  public async delete(
    options?: DeleteOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    try {
      options = { ...this.fs.defaultDeleteOptions, ...options };
      if (!options.ignoreHook && this.beforeDelete) {
        const result = await this.beforeDelete(this.path, options);
        if (result != null) {
          return result;
        }
      }
      await this._delete(options);
      if (!options.ignoreHook && this.afterDelete) {
        await this.afterDelete(this.path);
      }
      return true;
    } catch (e) {
      this._handleNoModificationAllowedError(errors, { e });
      return false;
    }
  }

  public async getParent(): Promise<Directory>;
  public async getParent(errors?: FileSystemError[]): Promise<Directory | null>;
  public async getParent(
    errors?: FileSystemError[]
  ): Promise<Directory | null> {
    const parentPath = getParentPath(this.path);
    return this.fs.getDirectory(parentPath, errors);
  }

  public async move(
    to: Entry,
    options?: MoveOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    let result = await this._xmit(
      to,
      {
        ...this.fs.defaultMoveOptions,
        ...options,
        recursive: true,
      },
      errors
    );
    if (!result) {
      return false;
    }

    result = await this.delete(
      {
        ...this.fs.defaultDeleteOptions,
        ...options,
        recursive: true,
      },
      errors
    );
    return result;
  }

  public mv = (to: Entry, options?: MoveOptions, errors?: FileSystemError[]) =>
    this.move(to, options, errors);

  public patch = (
    props: Stats,
    options?: PatchOptions,
    errors?: FileSystemError[]
  ) => this.fs.patch(this.path, props, options, errors);

  public remove = (options?: DeleteOptions, errors?: FileSystemError[]) =>
    this.delete(options, errors);

  public rm = (options?: DeleteOptions, errors?: FileSystemError[]) =>
    this.delete(options, errors);

  public stat(options?: HeadOptions): Promise<Stats>;
  public stat(options?: HeadOptions, errors?: FileSystemError[]) {
    return this.head(options, errors);
  }

  public toString = () => `${this.fs.repository}:${this.path}`;

  public toURL(options?: URLOptions): Promise<string>;
  public toURL(
    options?: URLOptions,
    errors?: FileSystemError[]
  ): Promise<string | null> {
    return this.fs.toURL(this.path, options, errors);
  }

  public abstract _delete(option: DeleteOptions): Promise<boolean>;
  public abstract _xmit(
    entry: Entry,
    options: XmitOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  public abstract head(options?: HeadOptions): Promise<Stats>;
  public abstract head(
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null>;

  protected _handleNoModificationAllowedError(
    errors?: FileSystemError[],
    params?: ErrorParams
  ) {
    return this.fs._handleError(
      NoModificationAllowedError.name,
      this.path,
      errors,
      params
    );
  }

  protected _handleNotFoundError(
    errors?: FileSystemError[],
    params?: ErrorParams
  ) {
    return this.fs._handleError(NotFoundError.name, this.path, errors, params);
  }

  protected _handleNotReadableError(
    errors?: FileSystemError[],
    params?: ErrorParams
  ) {
    return this.fs._handleError(
      NotReadableError.name,
      this.path,
      errors,
      params
    );
  }

  protected abstract _exists(options: Options): Promise<Stats>;
}
