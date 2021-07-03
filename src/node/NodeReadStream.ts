import * as fs from "fs";
import { OpenOptions, ReadStream, SeekOrigin } from "../core";
import { NodeFileSystemObject } from "./NodeFileSystemObject";

export class NodeReadStream extends ReadStream {
  private position = 0;
  private readStream?: fs.ReadStream;

  constructor(private fso: NodeFileSystemObject, options?: OpenOptions) {
    super(fso.path, options);
  }

  public async close(): Promise<void> {
    if (this.readStream && !this.readStream.destroyed) {
      this.readStream.destroy();
    }
  }

  public read(): Promise<BufferSource> {
    if (!this.readStream || this.readStream.destroyed) {
      this.readStream = fs.createReadStream(this.fso.getFullPath(), {
        flags: "r",
        highWaterMark: this.bufferSize,
      });
    }

    return this.readStream.read();
  }

  public async seek(offset: number, origin: SeekOrigin): Promise<void> {
    if (this.readStream && !this.readStream.destroyed) {
      this.readStream.destroy();
    }

    const flags = origin === SeekOrigin.End ? "a" : "w";
    let start: number | undefined;
    if (origin === SeekOrigin.Begin) {
      start = offset;
    } else if (origin === SeekOrigin.Current) {
      start = this.position + offset;
    } else {
      start = undefined;
    }

    this.readStream = fs.createReadStream(this.fso.getFullPath(), {
      flags,
      highWaterMark: this.bufferSize,
      start,
    });
    this.position = start || 0;
  }
}
