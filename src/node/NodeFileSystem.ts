import {
  Directory,
  FileForRead,
  FileSystem,
  FileForWrite,
  OpenOptions,
  OpenWriteOptions,
} from "../core";
import { normalizePath } from "../util/path";
import { NodeDirectory } from "./NodeDirectory";
import { NodeFileRead } from "./NodeFileForRead";
import { NodeFileWrite } from "./NodeFileWrite";

export class NodeFileSystem extends FileSystem {
  constructor(rootDir: string) {
    super(normalizePath(rootDir));
  }

  public async openDirectory(path: string): Promise<Directory> {
    return new NodeDirectory(this, path);
  }

  public async openFileForRead(
    path: string,
    options: OpenOptions
  ): Promise<FileForRead> {
    return new NodeFileRead(this, path, options);
  }

  public async openFileForWrite(
    path: string,
    options?: OpenWriteOptions
  ): Promise<FileForWrite> {
    return new NodeFileWrite(this, path, options);
  }
}
