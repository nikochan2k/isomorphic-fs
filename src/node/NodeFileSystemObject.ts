import * as fs from "fs";
import { pathToFileURL } from "url";
import {
  InvalidModificationError,
  InvalidStateError,
  NotFoundError,
  NotReadableError,
} from "../errors";
import {
  FileSystem,
  FileSystemObject,
  RmOptions,
  Stats,
  Times,
  URLType,
} from "../core";
import { isArrayBuffer, isBuffer, isUint8Array } from "../util/buffer";
import { joinPathes } from "../util/path";

export class NodeFileSystemObject extends FileSystemObject {
  constructor(fs: FileSystem, path: string) {
    super(fs, path);
  }

  public convertError(err: NodeJS.ErrnoException, write: boolean) {
    if (err.code === "ENOENT") {
      return new NotFoundError(this.fs.repository, this.path, err);
    }
    if (write) {
      return new InvalidModificationError(this.fs.repository, this.path, err);
    } else {
      return new NotReadableError(this.fs.repository, this.path, err);
    }
  }

  public getFullPath() {
    return joinPathes(this.fs.repository, this.path);
  }

  public getStats(): Promise<Stats> {
    return new Promise<Stats>((resolve, reject) => {
      fs.stat(this.getFullPath(), (err, stats) => {
        if (err) {
          reject(this.convertError(err, false));
        } else {
          resolve({
            size: stats.size,
            accessed: stats.atimeMs,
            modified: stats.mtimeMs,
          });
        }
      });
    });
  }

  public async getURL(_urlType?: URLType): Promise<string> {
    return pathToFileURL(this.getFullPath()).href;
  }

  public isDirectory(): boolean {
    throw new Error("Method not implemented.");
  }

  public isFile(): boolean {
    throw new Error("Method not implemented.");
  }

  public rm(options?: RmOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.rm(
        this.getFullPath(),
        { force: options?.force, recursive: options?.recursive },
        (err) => {
          if (err) {
            reject(
              new InvalidModificationError(this.fs.repository, this.path, err)
            );
          } else {
            resolve();
          }
        }
      );
    });
  }

  public setTimes(times: Times): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (typeof times.accessed !== "number") {
        reject(
          new InvalidStateError(
            this.fs.repository,
            this.path,
            "No accessed time"
          )
        );
        return;
      }
      if (typeof times.modified !== "number") {
        reject(
          new InvalidStateError(
            this.fs.repository,
            this.path,
            "No modified time"
          )
        );
        return;
      }
      fs.utimes(this.getFullPath(), times.accessed, times.modified, (err) => {
        if (err) {
          reject(this.convertError(err, true));
        } else {
          resolve();
        }
      });
    });
  }

  public toBuffer(data: BufferSource): Buffer | Uint8Array {
    if (!data) {
      return Buffer.from([]);
    }

    let buffer: Buffer | Uint8Array;
    if (isBuffer(data)) {
      buffer = data;
    } else if (isUint8Array(data)) {
      buffer = data;
    } else if (isArrayBuffer(data)) {
      buffer = Buffer.from(data);
    } else {
      throw new InvalidStateError(
        this.fs.repository,
        this.path,
        "Illegal buffer: " + data
      );
    }
    return buffer;
  }
}
