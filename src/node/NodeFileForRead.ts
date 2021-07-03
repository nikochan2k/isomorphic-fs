import { createHash } from "crypto";
import { createReadStream, ReadStream } from "fs";
import {
  FileForRead,
  FileSystem,
  OpenOptions,
  RmOptions,
  Stats,
  Times,
  URLType,
} from "../core";
import { NodeFileSystemObject } from "./NodeFileSystemObject";

export class NodeFileRead extends FileForRead {
  private nodeFSO: NodeFileSystemObject;
  private readStream?: ReadStream;

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
      const input = createReadStream(this.nodeFSO.getFullPath());
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

  private createReadStream() {
    if (!this.readStream || this.readStream.destroyed) {
      this.readStream = createReadStream(this.nodeFSO.getFullPath(), {
        highWaterMark: this.highWaterMark || this.highWaterMark,
        start: this.start,
      });
    }
    return this.readStream;
  }
}
