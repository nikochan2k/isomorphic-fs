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

  public read(size?: number): Promise<ArrayBuffer | Uint8Array | Buffer> {
    if (!this.readStream || this.readStream.destroyed) {
      this.readStream = fs.createReadStream(this.fso.getFullPath(), {
        flags: "r",
        highWaterMark: this.bufferSize,
      });
    }

    const readStream = this.readStream;
    const promise = new Promise<ArrayBuffer | Uint8Array | Buffer>(
      (resolve, reject) => {
        const onError = (err: Error) => {
          reject(this.fso.convertError(err, false));
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
        readStream.on("readable", onReadable);
      }
    );
    return promise;
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

    this.readStream = fs.createReadStream(this.fso.getFullPath(), {
      flags: "r",
      highWaterMark: this.bufferSize,
      start,
    });
    this.position = start || 0;
  }
}
