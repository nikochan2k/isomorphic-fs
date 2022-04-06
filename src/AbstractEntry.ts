import { AbstractFileSystem } from "./AbstractFileSystem";
import {
  CopyOptions,
  DeleteOptions,
  Directory,
  Entry,
  ErrorLike,
  HeadOptions,
  MoveOptions,
  PatchOptions,
  Stats,
  URLOptions,
  XmitOptions,
} from "./core";
import { getParentPath } from "./util";

export abstract class AbstractEntry implements Entry {
  private afterDelete?: (path: string) => Promise<void>;
  private beforeDelete?: (
    path: string,
    options: DeleteOptions
  ) => Promise<boolean>;

  constructor(public readonly fs: AbstractFileSystem, public path: string) {
    const hook = fs.options.hook;
    if (hook) {
      this.beforeDelete = hook?.beforeDelete;
      this.afterDelete = hook?.afterDelete;
    }
  }

  public async copy(to: Entry, options?: CopyOptions): Promise<ErrorLike[]> {
    options = { force: false, recursive: false, ...options };
    const errors: ErrorLike[] = [];
    await this._xmit(to, errors, options);
    if (0 < errors.length) {
      console.warn(errors);
    }
    return errors;
  }

  public cp = (to: Entry, options?: CopyOptions | undefined) =>
    this.copy(to, options);

  public del = (options?: DeleteOptions | undefined) => this.delete(options);

  public async delete(options?: DeleteOptions): Promise<ErrorLike[]> {
    options = { force: false, recursive: false, ...options };
    if (!options.ignoreHook && this.beforeDelete) {
      if (await this.beforeDelete(this.path, options)) {
        return [];
      }
    }
    const errors: ErrorLike[] = [];
    await this._delete(options, errors);
    if (!options.ignoreHook && this.afterDelete) {
      await this.afterDelete(this.path);
    }
    return errors;
  }

  public async getParent(): Promise<Directory> {
    const parentPath = getParentPath(this.path);
    return this.fs.getDirectory(parentPath);
  }

  public async move(to: Entry, options?: MoveOptions): Promise<ErrorLike[]> {
    options = { force: false, ...options };
    const errors: ErrorLike[] = [];
    await this._xmit(to, errors, {
      bufferSize: options.bufferSize,
      force: options.force,
      recursive: true,
    });

    if (errors.length === 0) {
      const deleteErrors = await this.delete({
        force: options.force,
        recursive: true,
      });
      Array.prototype.push.apply(errors, deleteErrors);
    } else {
      console.warn(errors);
    }

    return errors;
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

  public abstract _delete(
    option: DeleteOptions,
    errors: (ErrorLike | string)[]
  ): Promise<void>;
  public abstract _xmit(
    entry: Entry,
    errors: (ErrorLike | string)[],
    options: XmitOptions
  ): Promise<void>;
  public abstract head(options?: HeadOptions): Promise<Stats>;
}
