import * as fs from "fs";
import { AbstractFileSystemObject } from "../core/AbstractFileSystemObject";
import { AbstractReadStream } from "../core/AbstractReadStream";
import { OpenOptions, SeekOrigin } from "../core/core";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";

export class NodeReadStream extends AbstractReadStream {
  private position = 0;
  private readStream?: fs.ReadStream;

  constructor(fso: AbstractFileSystemObject, options: OpenOptions) {
    super(fso, options);
  }

  public async _close(): Promise<void> {
    if (this.readStream && !this.readStream.destroyed) {
      this.readStream.destroy();
    }
  }

  public _read(
    size?: number
  ): Promise<ArrayBuffer | Uint8Array | Buffer | null> {
    const fso = this.fso;
    if (!this.readStream || this.readStream.destroyed) {
      this.readStream = fs.createReadStream(
        joinPaths(fso.fs.repository, fso.path),
        {
          flags: "r",
          highWaterMark: this.bufferSize,
        }
      );
    }

    const readStream = this.readStream;
    return new Promise<ArrayBuffer | Uint8Array | Buffer | null>(
      (resolve, reject) => {
        const onError = (err: Error) => {
          reject(convertError(fso.fs.repository, fso.path, err, false));
          readStream.off("error", onError);
        };
        readStream.on("error", onError);
        const onReadable = () => {
          let buffer: Buffer = size ? readStream.read(size) : null;
          if (buffer === null) {
            buffer = readStream.read();
          }
          if (buffer) {
            this.position += buffer.byteLength;
            resolve(buffer);
          } else {
            resolve(buffer);
          }
          readStream.off("readable", onReadable);
        };
        readStream.on("end", () => {
          resolve(null);
        });
        readStream.on("readable", onReadable);
      }
    );
  }

  public async seek(offset: number, origin: SeekOrigin): Promise<void> {
    if (this.readStream && !this.readStream.destroyed) {
      this.readStream.destroy();
    }

    let start: number | undefined;
    if (origin === SeekOrigin.Begin) {
      start = offset;
    } else if (origin === SeekOrigin.Current) {
      start = this.position + offset;
    } else {
      start = undefined;
    }

    this.readStream = fs.createReadStream(
      joinPaths(this.fso.fs.repository, this.fso.path),
      {
        flags: "r",
        highWaterMark: this.bufferSize,
        start,
      }
    );
    this.position = start || 0;
  }
}
