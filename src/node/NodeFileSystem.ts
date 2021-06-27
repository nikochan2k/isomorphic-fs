import {
  Directory,
  FileRead,
  FileSystem,
  FileWrite,
  OpenOptions,
  OpenWriteOptions,
} from "../core";
import { normalizePath } from "../util/path";
import { NodeDirectory } from "./NodeDirectory";
import { NodeFileRead } from "./NodeFileRead";
import { NodeFileWrite } from "./NodeFileWrite";

export class NodeFileSystem extends FileSystem {
  constructor(rootDir: string) {
    super(normalizePath(rootDir));
  }

  public async openDirectory(path: string): Promise<Directory> {
    return new NodeDirectory(this, path);
  }

  public async openRead(path: string, options: OpenOptions): Promise<FileRead> {
    return new NodeFileRead(this, path, options);
  }

  public async openWrite(
    path: string,
    options: OpenWriteOptions
  ): Promise<FileWrite> {
    return new NodeFileWrite(this, path, options);
  }
}
