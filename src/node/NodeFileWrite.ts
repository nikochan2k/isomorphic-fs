import * as fs from "fs";
import { InvalidModificationError } from "../errors";
import {
  FileSystem,
  FileWrite,
  OpenWriteOptions,
  RmOptions,
  Stats,
  Times,
  URLType,
} from "../core";
import { NodeFileSystemObject } from "./NodeFileSystemObject";

export class NodeFileWrite extends FileWrite {
  private nodeFSO: NodeFileSystemObject;
  private writeStream?: fs.WriteStream;

  constructor(fs: FileSystem, path: string, options: OpenWriteOptions) {
    super(fs, path, options);
    this.nodeFSO = new NodeFileSystemObject(fs, path);
  }

  public async close(): Promise<void> {
    if (this.writeStream && !this.writeStream.destroyed) {
      this.writeStream.close();
    }
  }

  public getHash(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  public getStats(): Promise<Stats> {
    return this.nodeFSO.getStats();
  }

  public getURL(_urlType?: URLType): Promise<string> {
    return this.nodeFSO.getURL();
  }

  public rm(options?: RmOptions): Promise<void> {
    return this.nodeFSO.rm(options);
  }

  public setTimes(times: Times): Promise<void> {
    return this.nodeFSO.setTimes(times);
  }

  public truncate(len?: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.truncate(this.nodeFSO.getFullPath(), len, (err) => {
        if (err) {
          reject(this.nodeFSO.convertError(err, true));
        } else {
          resolve();
        }
      });
    });
  }

  public write(data: BufferSource): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const writable = this.getStream();
      const buffer = this.nodeFSO.toBuffer(data);
      writable.on("error", (err) => {
        reject(
          new InvalidModificationError(this.fs.repository, this.path, err)
        );
      });
      writable.on("finish", () => {
        resolve(buffer.length);
      });
      writable.write(buffer);
      writable.end();
    });
  }

  private getStream() {
    if (!this.writeStream || this.writeStream.destroyed) {
      this.writeStream = fs.createWriteStream(this.nodeFSO.getFullPath(), {
        highWaterMark: this.highWaterMark || this.highWaterMark,
        start: this.start,
        flags: this.flags,
      });
    }
    return this.writeStream;
  }
}
