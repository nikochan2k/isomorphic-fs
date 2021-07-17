import * as fs from "fs";
import { OpenOptions, SeekOrigin, WriteStream } from "../core";
import { InvalidModificationError } from "../errors";
import { convertError } from "./NodeFileSystem";
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
      this.writeStream = undefined;
    }
  }

  public async seek(offset: number, origin: SeekOrigin): Promise<void> {
    await this.close();

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
    await this.close();

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

  public write(buffer: ArrayBuffer | Uint8Array | Buffer): Promise<void> {
    const fso = this.fso;
    if (!this.writeStream || this.writeStream.destroyed) {
      this.writeStream = fs.createWriteStream(fso.getFullPath(), {
        flags: "w",
        highWaterMark: this.bufferSize,
      });
    }

    const writeStream = this.writeStream;
    return new Promise<void>((resolve, reject) => {
      writeStream.write(buffer, (err) => {
        if (err) {
          reject(convertError(fso.fs.repository, fso.path, err, true));
          return;
        }
        this.position += buffer.byteLength;
        resolve();
      });
    });
  }
}
