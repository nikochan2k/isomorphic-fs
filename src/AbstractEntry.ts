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

  public cp = this.copy;
  public del = this.delete;
  public mv = this.move;
  public rm = this.delete;
  public stat = this.head;

  constructor(public readonly fs: AbstractFileSystem, public path: string) {
    this.path = normalizePath(path);
    const hook = fs.options.hook;
    if (hook) {
      this.beforeDelete = hook?.beforeDelete;
      this.afterDelete = hook?.afterDelete;
    }
  }

  public async copy(
    to: Entry,
    options: CopyOptions = { force: false, recursive: false }
  ): Promise<ErrorLike[]> {
    await this.head(); // check existance
    const copyErrors: ErrorLike[] = [];
    await this._xmit(to, copyErrors, {
      bufferSize: options.bufferSize,
      force: options.force,
      recursive: options.recursive,
    });
    return copyErrors;
  }

  public async delete(
    options: DeleteOptions = { force: false, recursive: false }
  ): Promise<ErrorLike[]> {
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

  public head(options: HeadOptions = {}): Promise<Stats> {
    return this.fs.head(this.path, options);
  }

  public async move(
    to: Entry,
    options: MoveOptions = { force: false }
  ): Promise<ErrorLike[]> {
    await this.head(); // check existance
    const copyErrors: ErrorLike[] = [];
    await this._xmit(to, copyErrors, {
      bufferSize: options.bufferSize,
      force: options.force,
      recursive: true,
    });

    if (copyErrors.length === 0) {
      const deleteErrors = await this.delete({
        force: options.force,
        recursive: false,
      });
      Array.prototype.push.apply(copyErrors, deleteErrors);
    }

    return copyErrors;
  }

  public patch = (props: Props, options: PatchOptions = {}) =>
    this.fs.patch(this.path, props, options);

  public toString = () => `${this.fs.repository}:${this.path}`;

  public toURL = (urlType?: URLType) => this.fs.toURL(this.path, urlType);

  public abstract _delete(
    option: DeleteOptions,
    errors: ErrorLike[]
  ): Promise<void>;

  public abstract _xmit(
    entry: Entry,
    copyErrors: ErrorLike[],
    options: XmitOptions
  ): Promise<void>;
}
