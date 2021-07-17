import * as fs from "fs";
import { pathToFileURL } from "url";
import {
  DeleteOptions,
  FileSystemOptions,
  HeadOptions,
  PatchOptions,
  Props,
  Stats,
  URLType,
} from "../core/common";
import { AbstractDirectory, File, AbstractFileSystem } from "../core/core";
import {
  InvalidModificationError,
  InvalidStateError,
  NotFoundError,
  NotReadableError,
} from "../core/errors";
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

export class NodeFileSystem extends AbstractFileSystem {
  constructor(rootDir: string, options?: FileSystemOptions) {
    super(normalizePath(rootDir), options);
  }

  public _delete(path: string, options: DeleteOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.rm(
        this.getFullPath(path),
        { force: options.force, recursive: options.recursive },
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

  public _head(path: string, _options: HeadOptions): Promise<Stats> {
    return new Promise<Stats>((resolve, reject) => {
      fs.stat(this.getFullPath(path), (err, stats) => {
        if (err) {
          reject(convertError(this.repository, path, err, false));
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

  public _patch(
    path: string,
    props: Props,
    _options: PatchOptions
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (typeof props.accessed !== "number") {
        reject(
          new InvalidStateError(this.repository, path, "No accessed time")
        );
        return;
      }
      if (typeof props.modified !== "number") {
        reject(
          new InvalidStateError(this.repository, path, "No modified time")
        );
        return;
      }
      fs.utimes(
        this.getFullPath(path),
        props.accessed,
        props.modified,
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

  public async getDirectory(path: string): Promise<AbstractDirectory> {
    return new NodeDirectory(this, path);
  }

  public async getFile(path: string): Promise<File> {
    return new NodeFile(this, path);
  }

  public async toURL(path: string, _urlType?: URLType): Promise<string> {
    return pathToFileURL(this.getFullPath(path)).href;
  }

  protected getFullPath(path: string) {
    return joinPaths(this.repository, path);
  }
}
