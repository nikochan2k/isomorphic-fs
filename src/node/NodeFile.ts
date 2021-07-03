import { createHash } from "crypto";
import * as fs from "fs";
import {
  File,
  FileSystem,
  OpenOptions,
  RmOptions,
  Stats,
  Times,
  URLType,
} from "../core";
import { InvalidModificationError } from "../errors";
import { NodeFileSystemObject } from "./NodeFileSystemObject";

export class NodeFile extends File {
  private nodeFSO: NodeFileSystemObject;
  private readStream?: fs.ReadStream;
  private writeStream?: fs.WriteStream;

  constructor(fs: FileSystem, path: string, options: OpenOptions) {
    super(fs, path, options);
    this.nodeFSO = new NodeFileSystemObject(fs, path);
  }

  public async close(): Promise<void> {
    if (this.readStream && !this.readStream.destroyed) {
      this.readStream.close();
    }
  }

  public getHash(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const hash = createHash("sha256");
      const input = fs.createReadStream(this.nodeFSO.getFullPath());
      input.on("data", (data) => {
        hash.update(data);
      });
      input.on("end", () => {
        resolve(hash.digest("hex"));
      });
      input.on("error", (err) => {
        reject(this.nodeFSO.convertError(err, false));
      });
    });
  }

  public getStats(): Promise<Stats> {
    return this.nodeFSO.getStats();
  }

  public getURL(_urlType?: URLType): Promise<string> {
    return this.nodeFSO.getURL();
  }

  public async read(): Promise<BufferSource> {
    return this.createReadStream().read();
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
      const writable = this.createWriteStream();
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

  private createReadStream() {
    if (!this.readStream || this.readStream.destroyed) {
      this.readStream = fs.createReadStream(this.nodeFSO.getFullPath(), {
        highWaterMark: this.highWaterMark || this.highWaterMark,
        start: this.start,
      });
    }
    return this.readStream;
  }

  private createWriteStream() {
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
