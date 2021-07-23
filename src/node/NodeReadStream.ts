import * as fs from "fs";
import { AbstractFile } from "../core";
import { AbstractReadStream } from "../core/AbstractReadStream";
import { OpenOptions, SeekOrigin } from "../core/core";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";

export class NodeReadStream extends AbstractReadStream {
  private position = 0;
  private readStream?: fs.ReadStream;

  constructor(file: AbstractFile, options: OpenOptions) {
    super(file, options);
  }

  public async _close(): Promise<void> {
    this.destory();
  }

  private destory() {
    if (!this.readStream) {
      return;
    }

    this.readStream.removeAllListeners();
    this.readStream.destroy();
    this.readStream = null;
  }

  public _read(size?: number): Promise<ArrayBuffer | null> {
    return new Promise<ArrayBuffer | null>((resolve, reject) => {
      try {
        var readStream = this.buildReadStream();
      } catch (e) {
        reject(e);
      }
      const fso = this.fso;
      const onError = (err: Error) => {
        reject(convertError(fso.fs.repository, fso.path, err, false));
        this.destory();
      };
      readStream.on("error", onError);
      const onEnd = () => {
        resolve(null);
        this.destory();
      };
      readStream.on("end", onEnd);
      const onReadable = () => {
        const b: Buffer = size ? readStream.read(size) : readStream.read();
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
        readStream.removeAllListeners();
      };
      readStream.on("readable", onReadable);
    });
  }

  public async seek(offset: number, origin: SeekOrigin): Promise<void> {
    let start: number | undefined;
    if (origin === SeekOrigin.Begin) {
      start = offset;
    } else if (origin === SeekOrigin.Current) {
      start = this.position + offset;
    } else {
      start = undefined;
    }

    this.destory();
    this.buildReadStream(start);
    this.position = start || 0;
  }

  private buildReadStream(start?: number) {
    if (this.readStream && !this.readStream.destroyed) {
      return this.readStream;
    }

    const fso = this.fso;
    const repository = fso.fs.repository;
    const path = fso.path;
    try {
      this.readStream = fs.createReadStream(joinPaths(repository, path), {
        flags: "r",
        highWaterMark: this.bufferSize,
        start,
      });
      return this.readStream;
    } catch (e) {
      throw convertError(repository, path, e, false);
    }
  }
}
