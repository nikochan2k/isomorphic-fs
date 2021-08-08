import { createHash } from "sha256-uint8array";
import { toUint8Array } from "../util/buffer";
import { toHex } from "../util/misc";
import { AbstractDirectory } from "./AbstractDirectory";
import { AbstractFileSystem } from "./AbstractFileSystem";
import { AbstractFileSystemObject } from "./AbstractFileSystemObject";
import { AbstractReadStream } from "./AbstractReadStream";
import { AbstractWriteStream } from "./AbstractWriteStream";
import {
  DEFAULT_BUFFER_SIZE,
  DeleteOptions,
  File,
  OpenOptions,
  OpenWriteOptions,
  ReadStream,
  WriteStream,
  XmitError,
  XmitOptions,
} from "./core";
import {
  createDOMException,
  InvalidModificationError,
  NoModificationAllowedError,
  NotFoundError,
  NotSupportedError,
} from "./errors";

export abstract class AbstractFile
  extends AbstractFileSystemObject
  implements File
{
  private beforeGet?: (
    path: string,
    options: OpenOptions
  ) => Promise<ReadStream | null>;
  private beforePost?: (
    path: string,
    options: OpenWriteOptions
  ) => Promise<WriteStream | null>;
  private beforePut?: (
    path: string,
    options: OpenWriteOptions
  ) => Promise<WriteStream | null>;

  constructor(fs: AbstractFileSystem, path: string) {
    super(fs, path);
    const hook = fs.options?.hook;
    if (hook) {
      this.beforeGet = hook.beforeGet;
      this.beforePost = hook.beforePost;
      this.beforePut = hook.beforePut;
    }
  }

  public async _delete(
    options: DeleteOptions = { force: false, recursive: false }
  ): Promise<void> {
    try {
      const stats = await this.head();
      if (stats.size == null) {
        throw createDOMException({
          code: InvalidModificationError.code,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" is not a file`,
        });
      }
    } catch (e) {
      if (e.code === NotFoundError.code) {
        if (!options.force) {
          throw e;
        }
      } else {
        throw createDOMException({
          code: NoModificationAllowedError.code,
          repository: this.fs.repository,
          path: this.path,
          e,
        });
      }
    }
    return this._rm();
  }

  public async _xmit(
    toFso: AbstractFileSystemObject,
    copyErrors: XmitError[],
    options: XmitOptions
  ): Promise<void> {
    if (toFso instanceof AbstractDirectory) {
      throw createDOMException({
        code: InvalidModificationError.code,
        repository: toFso.fs.repository,
        path: toFso.path,
        e: `"${toFso}" is not a file`,
      });
    }
    const to = toFso as AbstractFile;
    try {
      await to.head();
      if (!options.force) {
        throw createDOMException({
          code: NoModificationAllowedError.code,
          repository: to.fs.repository,
          path: to.path,
        });
      }
    } catch (e) {
      if (e.code !== NotFoundError.code) {
        throw createDOMException({
          code: InvalidModificationError.code,
          repository: to.fs.repository,
          path: to.path,
          e,
        });
      }
    }

    const rs = await this.createReadStream({ bufferSize: options.bufferSize });
    try {
      let create: boolean;
      try {
        await to.stat();
        create = false;
      } catch (e) {
        if (e.code === NotFoundError.code) {
          create = true;
        } else {
          throw createDOMException({
            code: NotSupportedError.code,
            repository: toFso.fs.repository,
            path: toFso.path,
          });
        }
      }
      const ws = await to.createWriteStream({
        append: false,
        create,
        bufferSize: options.bufferSize,
      });
      try {
        await rs.pipe(ws);
      } finally {
        await ws.close();
      }
    } finally {
      await rs.close();
    }

    if (options.move) {
      try {
        await this.delete();
      } catch (error) {
        copyErrors.push({ from: this, to, error });
      }
    }
  }

  public async createReadStream(
    options: OpenOptions = {}
  ): Promise<ReadStream> {
    let rs: ReadStream | null | undefined;
    if (!options.ignoreHook && this.beforeGet) {
      rs = await this.beforeGet(this.path, options);
    }
    if (!rs) {
      rs = await this._createReadStream(options);
    }
    return rs as ReadStream;
  }

  public async createWriteStream(
    options: OpenWriteOptions = { append: false, create: true }
  ): Promise<WriteStream> {
    let ws: WriteStream | null | undefined;
    try {
      const stats = await this.head();
      if (stats.size == null) {
        throw createDOMException({
          code: InvalidModificationError.code,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" is directory`,
        });
      }
      if (options.create) {
        throw createDOMException({
          code: NoModificationAllowedError.code,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" has already exists`,
        });
      }
      if (!options.ignoreHook && this.beforePut) {
        ws = await this.beforePut(this.path, options);
      }
    } catch (e) {
      if (e.code === NotFoundError.code) {
        if (!options.create) {
          throw createDOMException({
            code: InvalidModificationError.code,
            repository: this.fs.repository,
            path: this.path,
          });
        }
        if (!options.ignoreHook && this.beforePost) {
          ws = await this.beforePost(this.path, options);
        }
      } else {
        throw createDOMException({
          code: NoModificationAllowedError.code,
          repository: this.fs.repository,
          path: this.path,
          e,
        });
      }
    }
    if (!ws) {
      ws = await this._createWriteStream(options);
    }
    return ws as WriteStream;
  }

  public async hash(options: OpenOptions = {}): Promise<string> {
    const rs = await this.createReadStream(options);
    try {
      const hash = createHash();
      let buffer: ArrayBuffer | Uint8Array | null;
      while ((buffer = await rs.read()) != null) {
        hash.update(toUint8Array(buffer));
      }

      return toHex(hash.digest());
    } finally {
      await rs.close();
    }
  }

  public async readAll(options: OpenOptions = {}): Promise<ArrayBuffer> {
    const stats = await this.head();
    const buffer = this._createBuffer(stats.size as number);
    const rs = await this.createReadStream(options);
    try {
      let pos = 0;
      let chunk: ArrayBuffer | null;
      while ((chunk = await rs.read()) != null) {
        const u8 = toUint8Array(chunk);
        buffer.set(u8, pos);
        pos += u8.byteLength;
      }
      return buffer;
    } finally {
      await rs.close();
    }
  }

  public async writeAll(
    buffer: ArrayBuffer | Uint8Array,
    options: OpenWriteOptions = { append: false, create: true }
  ): Promise<void> {
    const u8 = toUint8Array(buffer);
    const bufferSize = options.bufferSize || DEFAULT_BUFFER_SIZE;
    const ws = await this.createWriteStream(options);
    try {
      let pos = 0;
      let chunk: Uint8Array;
      do {
        chunk = u8.subarray(pos, pos + bufferSize);
        pos += bufferSize;
        if (0 < chunk.byteLength) {
          await ws.write(chunk);
        }
      } while (chunk.byteLength === bufferSize);
    } finally {
      await ws.close();
    }
  }

  public abstract _createReadStream(
    options: OpenOptions
  ): Promise<AbstractReadStream>;
  public abstract _createWriteStream(
    options: OpenWriteOptions
  ): Promise<AbstractWriteStream>;
  public abstract _rm(): Promise<void>;

  protected _createBuffer(byteLength: number): Uint8Array {
    const ab = new ArrayBuffer(byteLength);
    return new Uint8Array(ab);
  }
}
