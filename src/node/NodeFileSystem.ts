import * as fs from "fs";
import {
  DeleteOptions,
  Directory,
  File,
  FileSystem,
  FileSystemOptions,
  Stats,
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
  repository: string,
  path: string,
  err: NodeJS.ErrnoException,
  write: boolean
) {
  if (err.code === "ENOENT") {
    return new NotFoundError(repository, path, err);
  }
  if (write) {
    return new InvalidModificationError(repository, path, err);
  } else {
    return new NotReadableError(repository, path, err);
  }
}

export class NodeFileSystem extends FileSystem {
  constructor(rootDir: string, options?: FileSystemOptions) {
    super(normalizePath(rootDir), options);
  }

  public _delete(path: string, options?: DeleteOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.rm(
        this.getFullPath(path),
        { force: options?.force, recursive: options?.recursive },
        (err) => {
          if (err) {
            reject(convertError(this.repository, path, err, true));
          } else {
            resolve();
          }
        }
      );
    });
  }

  public _stat(path: string): Promise<Stats> {
    return new Promise<Stats>((resolve, reject) => {
      const fullPath = joinPaths(this.repository, path);
      fs.stat(fullPath, (err, stats) => {
        if (err) {
          reject(convertError(this.repository, fullPath, err, false));
        } else {
          if (stats.isDirectory()) {
            resolve({
              accessed: stats.atimeMs,
              modified: stats.mtimeMs,
            });
          } else {
            resolve({
              size: stats.size,
              accessed: stats.atimeMs,
              modified: stats.mtimeMs,
            });
          }
        }
      });
    });
  }

  public async getDirectory(path: string): Promise<Directory> {
    return new NodeDirectory(this, path);
  }

  public async getFile(path: string): Promise<File> {
    return new NodeFile(this, path);
  }

  protected getFullPath(path: string) {
    return joinPaths(this.repository, path);
  }
}
