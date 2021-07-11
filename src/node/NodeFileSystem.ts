import { stat } from "fs";
import {
  Directory,
  File,
  FileSystem,
  FileSystemObject,
  FileSystemOptions,
  OpenOptions,
} from "../core";
import {
  InvalidModificationError,
  NotFoundError,
  NotReadableError,
} from "../errors";
import { joinPaths, normalizePath } from "../util/path";
import { NodeDirectory } from "./NodeDirectory";
import { NodeFile } from "./NodeFile";

export function convertError(
  fs: FileSystem,
  path: string,
  err: NodeJS.ErrnoException,
  write: boolean
) {
  if (err.code === "ENOENT") {
    return new NotFoundError(fs.repository, path, err);
  }
  if (write) {
    return new InvalidModificationError(fs.repository, path, err);
  } else {
    return new NotReadableError(fs.repository, path, err);
  }
}

export class NodeFileSystem extends FileSystem {
  public getFileSystemObject(
    path: string,
    _options?: OpenOptions
  ): Promise<FileSystemObject> {
    const fullPath = joinPaths(this.repository, path);
    return new Promise<FileSystemObject>((resolve, reject) => {
      stat(fullPath, (err, stats) => {
        if (err) {
          reject(convertError(this, path, err, false));
        } else {
          if (stats.isDirectory()) {
            resolve(new NodeDirectory(this, path));
          } else {
            resolve(new NodeFile(this, path));
          }
        }
      });
    });
  }
  protected _createDirectory(path: string): Directory {
    return new NodeDirectory(this, path);
  }
  protected _createFile(path: string, _options?: OpenOptions): File {
    return new NodeFile(this, path);
  }
  constructor(rootDir: string, options?: FileSystemOptions) {
    super(normalizePath(rootDir), options);
  }
}
