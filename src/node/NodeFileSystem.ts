import { Directory, File, FileSystem, FileSystemOptions } from "../core";
import { normalizePath } from "../util/path";
import { NodeDirectory } from "./NodeDirectory";
import { NodeFile } from "./NodeFile";

export class NodeFileSystem extends FileSystem {
  constructor(rootDir: string, options?: FileSystemOptions) {
    super(normalizePath(rootDir), options);
  }

  public async getDirectory(path: string): Promise<Directory> {
    return new NodeDirectory(this, path);
  }

  public async getFile(path: string): Promise<File> {
    return new NodeFile(this, path);
  }
}
