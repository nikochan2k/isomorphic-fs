import {
  CopyOptions,
  DeleteOptions,
  Directory,
  Entry,
  ErrorLike,
  HeadOptions,
  MoveOptions,
  PatchOptions,
  Props,
  Stats,
  URLType,
  XmitOptions,
} from "./core";
import { AbstractFileSystem } from "./AbstractFileSystem";
import { getParentPath, normalizePath } from "./util";

export abstract class AbstractEntry implements Entry {
  private afterDelete?: (path: string) => Promise<void>;
  private beforeDelete?: (
    path: string,
    options: DeleteOptions
  ) => Promise<ErrorLike[]>;

  public cp = (to: Entry, options?: CopyOptions | undefined) =>
    this.copy(to, options);
  public del = (options?: DeleteOptions | undefined) => this.delete(options);
  public mv = (to: Entry, options?: MoveOptions | undefined) =>
    this.move(to, options);
  public rm = (options?: DeleteOptions | undefined) => this.delete(options);
  public stat = (options?: HeadOptions | undefined) => this.head(options);

  constructor(public readonly fs: AbstractFileSystem, public path: string) {
    this.path = normalizePath(path);
    const hook = fs.options.hook;
    if (hook) {
      this.beforeDelete = hook?.beforeDelete;
      this.afterDelete = hook?.afterDelete;
    }
  }

  public async copy(to: Entry, options?: CopyOptions): Promise<ErrorLike[]> {
    options = { force: false, recursive: false, ...options };
    await this.head(); // check existance
    const copyErrors: ErrorLike[] = [];
    await this._xmit(to, copyErrors, options);
    return copyErrors;
  }

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

  public head(options?: HeadOptions): Promise<Stats> {
    return this.fs.head(this.path, options);
  }

  public async move(to: Entry, options?: MoveOptions): Promise<ErrorLike[]> {
    options = { force: false, ...options };
    await this.head(options); // check existance
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
    }

    return errors;
  }

  public patch = (props: Props, options?: PatchOptions) =>
    this.fs.patch(this.path, props, options);

  public toString = () => `${this.fs.repository}:${this.path}`;

  public toURL = (urlType?: URLType) => this.fs.toURL(this.path, urlType);

  public abstract _delete(
    option: DeleteOptions,
    errors: (ErrorLike | string)[]
  ): Promise<void>;

  public abstract _xmit(
    entry: Entry,
    copyErrors: (ErrorLike | string)[],
    options: XmitOptions
  ): Promise<void>;
}
