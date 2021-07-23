import {
  CopyOptions,
  DeleteOptions,
  Directory,
  FileSystemObject,
  HeadOptions,
  MoveOptions,
  PatchOptions,
  Props,
  Stats,
  URLType,
  XmitError,
  XmitOptions,
} from "./core";
import { AbstractFileSystem } from "./AbstractFileSystem";
import { getParentPath } from "../util/path";

export abstract class AbstractFileSystemObject implements FileSystemObject {
  private afterDelete?: (path: string) => Promise<void>;
  private beforeDelete?: (
    path: string,
    options: DeleteOptions
  ) => Promise<boolean>;

  public cp = this.copy;
  public del = this.delete;
  public mv = this.move;
  public rm = this.delete;
  public stat = this.head;

  constructor(public readonly fs: AbstractFileSystem, public path: string) {
    const hook = fs.options.hook;
    if (hook) {
      this.beforeDelete = hook?.beforeDelete;
      this.afterDelete = hook?.afterDelete;
    }
  }

  public async copy(
    to: FileSystemObject,
    options: CopyOptions = { force: false, recursive: false }
  ): Promise<XmitError[]> {
    await this.head(); // check existance
    const copyErrors: XmitError[] = [];
    await this._xmit(to, copyErrors, {
      bufferSize: options.bufferSize,
      force: options.force,
      move: false,
      recursive: options.recursive,
    });
    return copyErrors;
  }

  public async delete(
    options: DeleteOptions = { force: false, recursive: false }
  ): Promise<void> {
    if (!options.ignoreHook && this.beforeDelete) {
      if (await this.beforeDelete(this.path, options)) {
        return;
      }
    }
    await this._delete(options);
    if (!options.ignoreHook && this.afterDelete) {
      await this.afterDelete(this.path);
    }
  }

  public async getParent(): Promise<Directory> {
    const parentPath = getParentPath(this.path);
    return this.fs.getDirectory(parentPath);
  }

  public head(options: HeadOptions = {}): Promise<Stats> {
    return this.fs.head(this.path, options);
  }

  public async move(
    to: FileSystemObject,
    options: MoveOptions
  ): Promise<XmitError[]> {
    await this.head(); // check existance
    const copyErrors: XmitError[] = [];
    await this._xmit(to, copyErrors, {
      bufferSize: options.bufferSize,
      force: options.force,
      move: true,
      recursive: true,
    });
    return copyErrors;
  }

  public patch = (props: Props, options: PatchOptions = {}) =>
    this.fs.patch(this.path, props, options);

  public toString = () => `${this.fs.repository}:${this.path}`;

  public toURL = (urlType?: URLType) => this.fs.toURL(this.path, urlType);

  public abstract _delete(options: DeleteOptions): Promise<void>;
  public abstract _xmit(
    fso: FileSystemObject,
    copyErrors: XmitError[],
    options: XmitOptions
  ): Promise<void>;
}
