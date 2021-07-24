import * as fs from "fs";
import { AbstractFile } from "../core";
import { AbstractWriteStream } from "../core/AbstractWriteStream";
import { OpenWriteOptions, SeekOrigin } from "../core/core";
import { InvalidModificationError } from "../core/errors";
import { joinPaths } from "../util/path";
import { toBuffer } from "./buffer";
import { convertError } from "./NodeFileSystem";

export class NodeWriteStream extends AbstractWriteStream {
  private writeStream?: fs.WriteStream;

  constructor(file: AbstractFile, options: OpenWriteOptions) {
    super(file, options);
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

  public async _write(buffer: ArrayBuffer | Uint8Array): Promise<void> {
    if (this.options.append) {
      await this.seek(0, SeekOrigin.End);
    } else {
      this._buildWriteStream();
    }

    const writeStream = this.writeStream as fs.WriteStream;
    return new Promise<void>((resolve, reject) => {
      const nodeBuffer = toBuffer(buffer);
      writeStream.write(nodeBuffer, (err) => {
        if (err) {
          const fso = this.fso;
          reject(convertError(fso.fs.repository, fso.path, err, true));
          return;
        }
        this.position += nodeBuffer.byteLength;
        resolve();
      });
    });
  }

  protected async _seek(start: number): Promise<void> {
    await this.close();
    this._buildWriteStream(start);
  }

  private _buildWriteStream(start?: number) {
    if (!start && this.writeStream && !this.writeStream.destroyed) {
      return this.writeStream;
    }

    const fso = this.fso;
    try {
      this.writeStream = fs.createWriteStream(
        joinPaths(fso.fs.repository, fso.path),
        {
          flags: start ? "a" : "w",
          highWaterMark: this.bufferSize,
          start,
        }
      );
      this.position = start || 0;
      return this.writeStream;
    } catch (e) {
      throw convertError(fso.fs.repository, fso.path, e, true);
    }
  }
}
