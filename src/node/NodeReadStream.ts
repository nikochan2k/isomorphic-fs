import * as fs from "fs";
import { AbstractFile } from "../core";
import { AbstractReadStream } from "../core/AbstractReadStream";
import { OpenOptions } from "../core/core";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";

export class NodeReadStream extends AbstractReadStream {
  private readStream?: fs.ReadStream;

  constructor(file: AbstractFile, options: OpenOptions) {
    super(file, options);
  }

  public async _close(): Promise<void> {
    this._destory();
  }

  private _destory() {
    if (!this.readStream) {
      return;
    }

    this.readStream.removeAllListeners();
    this.readStream.destroy();
    this.readStream = undefined;
  }

  public _read(size?: number): Promise<ArrayBuffer | null> {
    return new Promise<ArrayBuffer | null>((resolve, reject) => {
      try {
        var readStream = this._buildReadStream();
      } catch (e) {
        reject(e);
        return;
      }
      const fso = this.fso;
      const onError = (err: Error) => {
        reject(convertError(fso.fs.repository, fso.path, err, false));
        this._destory();
      };
      readStream.on("error", onError);
      const onEnd = () => {
        resolve(null);
        this._destory();
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

  public async _seek(start: number): Promise<void> {
    this._destory();
    this._buildReadStream(start);
    this.position = start;
  }

  private _buildReadStream(start?: number) {
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
