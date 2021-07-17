import * as fs from "fs";
import { OpenWriteOptions, SeekOrigin, WriteStream } from "../core";
import { InvalidModificationError } from "../errors";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";
import { NodeFileSystemObject } from "./NodeFileSystemObject";

export class NodeWriteStream extends WriteStream {
  private position = 0;
  private writeStream?: fs.WriteStream;

  constructor(fso: NodeFileSystemObject, options: OpenWriteOptions) {
    super(fso, options);
  }

  public async _close(): Promise<void> {
    if (this.writeStream && !this.writeStream.destroyed) {
      this.writeStream.destroy();
      this.writeStream = undefined;
    }
  }

  public async _setLength(len: number): Promise<void> {
    await this.close();

    return new Promise<void>((resolve, reject) => {
      const fso = this.fso;
      fs.truncate(joinPaths(fso.fs.repository, fso.path), len, (err) => {
        if (err) {
          reject(
            new InvalidModificationError(fso.fs.repository, fso.path, err)
          );
          return;
        }
        resolve();
      });
    });
  }

  public _write(buffer: ArrayBuffer | Uint8Array | Buffer): Promise<void> {
    const fso = this.fso;
    if (!this.writeStream || this.writeStream.destroyed) {
      this.writeStream = fs.createWriteStream(
        joinPaths(fso.fs.repository, fso.path),
        {
          flags: "w",
          highWaterMark: this.bufferSize,
        }
      );
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

    this.writeStream = fs.createWriteStream(
      joinPaths(this.fso.fs.repository, this.fso.path),
      {
        flags,
        highWaterMark: this.bufferSize,
        start,
      }
    );
    this.position = start || 0;
  }
}
