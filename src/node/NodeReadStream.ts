import * as fs from "fs";
import { AbstractReadStream } from "../core/AbstractReadStream";
import { OpenOptions } from "../core/core";
import { NodeFile } from "./NodeFile";
import { convertError } from "./NodeFileSystem";

export class NodeReadStream extends AbstractReadStream {
  private readStream?: fs.ReadStream;

  constructor(private file: NodeFile, options: OpenOptions) {
    super(file, options);
  }

  public async _close(): Promise<void> {
    this._destory();
  }

  public _read(size?: number): Promise<ArrayBuffer | null> {
    const readStream = this._buildReadStream();
    return new Promise<ArrayBuffer | null>((resolve, reject) => {
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
  }

  private _buildReadStream(start?: number) {
    if (this.readStream && !this.readStream.destroyed) {
      if (start) {
        this._destory();
      } else {
        return this.readStream;
      }
    }

    const fso = this.fso;
    const repository = fso.fs.repository;
    const path = fso.path;
    try {
      this.readStream = fs.createReadStream(this.file._getFullPath(), {
        flags: "r",
        highWaterMark: this.bufferSize,
        start,
      });
      this.position = start || 0;
      return this.readStream;
    } catch (e) {
      throw convertError(repository, path, e, false);
    }
  }

  private _destory() {
    if (!this.readStream) {
      return;
    }

    this.readStream.removeAllListeners();
    this.readStream.destroy();
    this.readStream = undefined;
  }
}
