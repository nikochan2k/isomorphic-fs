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

  public _read(size?: number): Promise<ArrayBuffer | Uint8Array | null> {
    const fso = this.fso;
    if (!this.readStream || this.readStream.destroyed) {
      try {
        this.readStream = fs.createReadStream(
          joinPaths(fso.fs.repository, fso.path),
          {
            flags: "r",
            highWaterMark: this.bufferSize,
          }
        );
      } catch (e) {
        throw convertError(fso.fs.repository, fso.path, e, false);
      }
    }

    const readStream = this.readStream;
    return new Promise<ArrayBuffer | Uint8Array | null>((resolve, reject) => {
      const onError = (err: Error) => {
        readStream.destroy();
        reject(convertError(fso.fs.repository, fso.path, err, false));
        cleanup();
      };
      readStream.on("error", onError);
      const onEnd = () => {
        readStream.destroy();
        resolve(null);
        cleanup();
      };
      readStream.on("end", onEnd);
      const onReadable = () => {
        let b: Buffer = size ? readStream.read(size) : null;
        if (b === null) {
          b = readStream.read();
        }
        if (b) {
          this.position += b.byteLength;
          const buffer = b.buffer.slice(
            b.byteOffset,
            b.byteOffset + b.byteLength
          );
          resolve(buffer);
        } else {
          resolve(null);
        }
        cleanup();
      };
      readStream.on("readable", onReadable);
      const cleanup = () => {
        readStream.off("readable", onReadable);
        readStream.off("end", onEnd);
        readStream.off("error", onError);
      };
    });
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

    const fso = this.fso;
    try {
      this.readStream = fs.createReadStream(
        joinPaths(fso.fs.repository, fso.path),
        {
          flags: "r",
          highWaterMark: this.bufferSize,
          start,
        }
      );
    } catch (e) {
      throw convertError(fso.fs.repository, fso.path, e, false);
    }
    this.position = start || 0;
  }
}
