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
  private afterDelete?: (path: string) => Promise<void>;
  private beforeDelete?: (
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

  public async copy(to: Entry, options?: CopyOptions): Promise<boolean> {
    options = { force: false, recursive: false, ...options };
    return this._xmit(to, options);
  }

  public cp = (to: Entry, options?: CopyOptions | undefined) =>
    this.copy(to, options);

  public del = (options?: DeleteOptions | undefined) => this.delete(options);

  public async delete(options?: DeleteOptions): Promise<boolean> {
    try {
      options = { force: false, recursive: false, ...options };
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
      this._handleNoModificationAllowedError(options?.errors, { e });
      return false;
    }
  }

  public async getParent(options?: Options): Promise<Directory | null> {
    const parentPath = getParentPath(this.path);
    return this.fs.getDirectory(parentPath, options);
  }

  public async move(to: Entry, options?: MoveOptions): Promise<boolean> {
    options = { force: false, ...options };
    let result = await this._xmit(to, {
      ...options,
      recursive: true,
    });
    if (!result) {
      return false;
    }

    result = await this.delete({
      ...options,
      recursive: true,
    });
    return true;
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

  public abstract _delete(option: DeleteOptions): Promise<boolean>;
  public abstract _xmit(entry: Entry, options: XmitOptions): Promise<boolean>;
  public abstract head(options?: HeadOptions): Promise<Stats | null>;

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
}
