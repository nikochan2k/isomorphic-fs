import { FileSystem, FileSystemObject, XmitError, XmitOptions } from "../core";
import { joinPaths } from "../util/path";

export class NodeFileSystemObject extends FileSystemObject {
  public override toString = this.getFullPath;

  constructor(fs: FileSystem, path: string) {
    super(fs, path);
  }

  public _xmit(
    _fso: FileSystemObject,
    _move: boolean,
    _copyErrors: XmitError[],
    _options: XmitOptions
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getFullPath() {
    return joinPaths(this.fs.repository, this.path);
  }
}
