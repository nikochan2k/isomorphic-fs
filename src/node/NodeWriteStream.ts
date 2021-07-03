import * as fs from "fs";
import { OpenOptions, SeekOrigin, WriteStream } from "../core";
import { InvalidModificationError } from "../errors";
import { NodeFileSystemObject } from "./NodeFileSystemObject";

export class NodeWriteStream extends WriteStream {
  private position = 0;
  private writeStream?: fs.WriteStream;

  constructor(private fso: NodeFileSystemObject, options?: OpenOptions) {
    super(fso.path, options);
  }

  public async close(): Promise<void> {
    if (this.writeStream && !this.writeStream.destroyed) {
      this.writeStream.destroy();
    }
  }

  public async seek(offset: number, origin: SeekOrigin): Promise<void> {
    if (this.writeStream && !this.writeStream.destroyed) {
      this.writeStream.destroy();
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

    this.writeStream = fs.createWriteStream(this.fso.getFullPath(), {
      flags,
      highWaterMark: this.bufferSize,
      start,
    });
    this.position = start || 0;
  }

  public async setLength(len: number): Promise<void> {
    if (this.writeStream && !this.writeStream.destroyed) {
      this.writeStream.destroy();
    }

    return new Promise<void>((resolve, reject) => {
      fs.truncate(this.fso.getFullPath(), len, (err) => {
        if (err) {
          reject(
            new InvalidModificationError(
              this.fso.fs.repository,
              this.fso.path,
              err
            )
          );
          return;
        }
        resolve();
      });
    });
  }

  public write(data: BufferSource): Promise<number> {
    if (!this.writeStream || this.writeStream.destroyed) {
      this.writeStream = fs.createWriteStream(this.fso.getFullPath(), {
        flags: "w+",
        highWaterMark: this.bufferSize,
      });
    }

    const writeStream = this.writeStream;
    return new Promise<number>((resolve, reject) => {
      const buffer = this.fso.toBuffer(data);
      writeStream.on("error", (err) =>
        reject(
          new InvalidModificationError(
            this.fso.fs.repository,
            this.fso.path,
            err
          )
        )
      );
      writeStream.on("finish", () => {
        this.position += buffer.byteLength;
        resolve(buffer.byteLength);
      });
      writeStream.end(buffer);
    });
  }
}
