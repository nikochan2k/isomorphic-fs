import * as fs from "fs";
import { AbstractFileSystemObject } from "../core/AbstractFileSystemObject";
import { AbstractWriteStream } from "../core/AbstractWriteStream";
import { OpenWriteOptions, SeekOrigin } from "../core/core";
import { InvalidModificationError } from "../core/errors";
import { joinPaths } from "../util/path";
import { toBuffer } from "./buffer";
import { convertError } from "./NodeFileSystem";

export class NodeWriteStream extends AbstractWriteStream {
  private position = 0;
  private writeStream?: fs.WriteStream;

  constructor(fso: AbstractFileSystemObject, options: OpenWriteOptions) {
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

  public _write(buffer: ArrayBuffer | Uint8Array): Promise<void> {
    const fso = this.fso;
    if (!this.writeStream || this.writeStream.destroyed) {
      try {
        this.writeStream = fs.createWriteStream(
          joinPaths(fso.fs.repository, fso.path),
          {
            flags: this.options.append ? "a" : "w",
            highWaterMark: this.bufferSize,
          }
        );
      } catch (e) {
        throw convertError(fso.fs.repository, fso.path, e, true);
      }
    }

    const writeStream = this.writeStream;
    return new Promise<void>((resolve, reject) => {
      const nodeBuffer = toBuffer(buffer);
      writeStream.write(nodeBuffer, (err) => {
        if (err) {
          reject(convertError(fso.fs.repository, fso.path, err, true));
          return;
        }
        this.position += nodeBuffer.byteLength;
        resolve();
      });
    });
  }

  public async seek(offset: number, origin: SeekOrigin): Promise<void> {
    await this.close();

    const fso = this.fso;
    const flags = origin === SeekOrigin.End ? "a" : "w";
    let start: number | undefined;
    if (origin === SeekOrigin.Begin) {
      start = offset;
      this.position = start;
    } else if (origin === SeekOrigin.Current) {
      start = this.position + offset;
      this.position = start;
    } else {
      start = undefined;
      const stats = await fso.stat();
      this.position = stats.size as number;
    }

    try {
      this.writeStream = fs.createWriteStream(
        joinPaths(fso.fs.repository, fso.path),
        {
          flags,
          highWaterMark: this.bufferSize,
          start,
        }
      );
    } catch (e) {
      throw convertError(fso.fs.repository, fso.path, e, true);
    }
  }
}
