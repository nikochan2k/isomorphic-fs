import {
  CopyOptions,
  DeleteOptions,
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
  public cp = this.copy;
  public del = this.delete;
  public mv = this.move;
  public rm = this.delete;
  public stat = this.head;

  constructor(public readonly fs: AbstractFileSystem, public path: string) {}

  public async copy(
    fso: FileSystemObject,
    options: CopyOptions = { force: false, recursive: false }
  ): Promise<XmitError[]> {
    const copyErrors: XmitError[] = [];
    await this._xmit(fso, copyErrors, {
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
    return this.fs.delete(this.path, options);
  }

  public async getParent(): Promise<string> {
    return getParentPath(this.path);
  }

  public head(options: HeadOptions = {}): Promise<Stats> {
    return this.fs.head(this.path, options);
  }

  public async move(
    fso: FileSystemObject,
    options: MoveOptions
  ): Promise<XmitError[]> {
    const copyErrors: XmitError[] = [];
    await this._xmit(fso, copyErrors, {
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

  public abstract _xmit(
    fso: FileSystemObject,
    copyErrors: XmitError[],
    options: XmitOptions
  ): Promise<void>;
}
