import { Directory, File, FileSystem } from "../core";
import { normalizePath } from "../util/path";
import { NodeDirectory } from "./NodeDirectory";
import { NodeFile } from "./NodeFile";

export class NodeFileSystem extends FileSystem {
  constructor(rootDir: string) {
    super(normalizePath(rootDir));
  }

  public async openDirectory(path: string): Promise<Directory> {
    return new NodeDirectory(this, path);
  }

  public async openFile(path: string): Promise<File> {
    return new NodeFile(this, path);
  }
}
