import {
  DeleteOptions,
  FileSystemObject,
  HeadOptions,
  PatchOptions,
  Props,
  Stats,
  URLType,
  XmitError,
  XmitOptions,
} from "./common";
import { AbstractFileSystem } from "./AbstractFileSystem";
import { getParentPath } from "../util/path";

export abstract class AbstractFileSystemObject implements FileSystemObject {
  public del = this.delete;
  public rm = this.delete;
  public stat = this.head;

  constructor(public readonly fs: AbstractFileSystem, public path: string) {}

  public async copy(
    fso: FileSystemObject,
    options: XmitOptions
  ): Promise<XmitError[]> {
    const copyErrors: XmitError[] = [];
    await this._xmit(fso, false, copyErrors, options);
    return copyErrors;
  }

  public async delete(options: DeleteOptions = {}): Promise<void> {
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
    options: XmitOptions
  ): Promise<XmitError[]> {
    const copyErrors: XmitError[] = [];
    await this._xmit(fso, true, copyErrors, options);
    return copyErrors;
  }

  public patch = (props: Props, options: PatchOptions = {}) =>
    this.fs.patch(this.path, props, options);

  public toString = () => `${this.fs.repository}:${this.path}`;

  public toURL = (urlType?: URLType) => this.fs.toURL(this.path, urlType);

  public abstract _xmit(
    fso: FileSystemObject,
    move: boolean,
    copyErrors: XmitError[],
    options: XmitOptions
  ): Promise<void>;
}
