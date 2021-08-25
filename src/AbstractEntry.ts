import { AbstractFileSystem } from "./AbstractFileSystem";
import {
  CopyOptions,
  DeleteOptions,
  Directory,
  Entry,
  HeadOptions,
  MoveOptions,
  PatchOptions,
  Props,
  Ret,
  Ret2,
  Stats,
  UnlinkOptions,
  URLType,
  XmitOptions,
} from "./core";
import { getParentPath, normalizePath } from "./util";

export abstract class AbstractEntry implements Entry {
  private afterDelete?: (path: string) => Promise<void>;
  private beforeDelete?: (
    path: string,
    options: DeleteOptions
  ) => Promise<Ret2<number> | null>;

  public cp = this.copy;
  public del = this.delete;
  public mv = this.move;
  public ren = this.move;
  public rename = this.move;
  public rm = this.delete;
  public stat = this.head;
  public unlink = this.delete;

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
  ): Promise<Ret2<number>> {
    const [, e] = await this.head(); // check existance
    if (e) return [0, [e]];
    const xmitOptions: XmitOptions = {
      bufferSize: options.bufferSize,
      force: options.force,
      move: false,
      recursive: options.recursive,
      copied: 0,
      moved: 0,
      errors: [],
    };
    await this._xmit(to, xmitOptions);
    return [xmitOptions.copied, xmitOptions.errors];
  }

  public async delete(
    options: DeleteOptions = { force: false, recursive: false }
  ): Promise<Ret2<number>> {
    if (!options.ignoreHook && this.beforeDelete) {
      const result = await this.beforeDelete(this.path, options);
      if (result) return result;
    }
    const unlinkOptions: UnlinkOptions = {
      ...options,
      deleted: 0,
      errors: [],
    };
    await this._delete(unlinkOptions);
    if (!options.ignoreHook && this.afterDelete) {
      await this.afterDelete(this.path);
    }
    return [unlinkOptions.deleted, unlinkOptions.errors];
  }

  public async getParent(): Promise<Ret<Directory>> {
    const parentPath = getParentPath(this.path);
    return this.fs.getDirectory(parentPath);
  }

  public head(options: HeadOptions = {}): Promise<Ret<Stats>> {
    return this.fs.head(this.path, options);
  }

  public async move(
    to: Entry,
    options: MoveOptions = { force: false }
  ): Promise<Ret2<number>> {
    await this.head(); // check existance
    const xmitOptions: XmitOptions = {
      bufferSize: options.bufferSize,
      force: options.force,
      move: true,
      recursive: true,
      copied: 0,
      moved: 0,
      errors: [],
    };
    await this._xmit(to, xmitOptions);
    return [xmitOptions.moved, xmitOptions.errors];
  }

  public patch = (props: Props, options: PatchOptions = {}) =>
    this.fs.patch(this.path, props, options);

  public toString = () => `${this.fs.repository}:${this.path}`;

  public toURL = (urlType?: URLType) => this.fs.toURL(this.path, urlType);

  public abstract _delete(options: UnlinkOptions): Promise<void>;
  public abstract _xmit(entry: Entry, options: XmitOptions): Promise<void>;
}
