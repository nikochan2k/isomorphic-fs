import { createHash } from "sha256-uint8array";
import { Converter, getSize, isBlob } from "../util/conv";
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
  OpenReadOptions,
  OpenWriteOptions,
  ReadStream,
  Source,
  SourceType,
  WriteStream,
  XmitError,
  XmitOptions,
} from "./core";
import {
  createError,
  NotFoundError,
  NotReadableError,
  SecurityError,
  TypeMismatchError,
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

  public async _convert(
    chunk: Source,
    type: SourceType,
    converter: Converter
  ): Promise<Source> {
    switch (type) {
      case "ArrayBuffer":
        return converter.toArrayBuffer(chunk);
      case "Uint8Array":
        return converter.toUint8Array(chunk);
      case "Buffer":
        return converter.toBuffer(chunk);
      case "Blob":
        return converter.toBlob(chunk);
      case "Base64":
        const base64 = await converter.toBase64(chunk);
        return { value: base64, encoding: "Base64" };
      case "BinaryString":
        const binaryString = await converter.toBinaryString(chunk);
        return { value: binaryString, encoding: "BinaryString" };
      case "Text":
        const text = await converter.toBinaryString(chunk);
        return { value: text, encoding: "Text" };
    }
  }

  public async _delete(
    options: DeleteOptions = { force: false, recursive: false }
  ): Promise<void> {
    try {
      const stats = await this.head();
      if (stats.size == null) {
        throw createError({
          name: TypeMismatchError.name,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" is not a file`,
        });
      }
    } catch (e) {
      if (e.name === NotFoundError.name) {
        if (!options.force) {
          throw e;
        }
      } else {
        throw createError({
          name: NotReadableError.name,
          repository: this.fs.repository,
          path: this.path,
          e,
        });
      }
    }
    return this._rm();
  }

  public async _joinChunks(
    chunks: Source[],
    length: number,
    type: SourceType
  ): Promise<Source> {
    switch (type) {
      case "ArrayBuffer":
      case "Uint8Array":
      case "Buffer":
        let u8: Uint8Array;
        if (type === "Buffer") {
          u8 = Buffer.alloc(length);
        } else {
          const ab = new ArrayBuffer(length);
          u8 = new Uint8Array(ab);
        }
        let u8Pos = 0;
        for (const chunk of chunks) {
          const u8Chunk =
            type === "ArrayBuffer"
              ? new Uint8Array(chunk as ArrayBuffer)
              : (chunk as Uint8Array);
          u8.set(u8Chunk, u8Pos);
          u8Pos += u8Chunk.byteLength;
        }
        return type === "ArrayBuffer" ? u8.buffer : u8;
      case "Blob":
        const blobs: Blob[] = [];
        for (const chunk of chunks) {
          blobs.push(chunk as Blob);
        }
        return new Blob(blobs);
      case "Base64":
      case "BinaryString":
      case "Text":
        return { value: chunks.join(""), encoding: type };
    }
  }

  public async _xmit(
    toFso: AbstractFileSystemObject,
    copyErrors: XmitError[],
    options: XmitOptions
  ): Promise<void> {
    if (toFso instanceof AbstractDirectory) {
      throw createError({
        name: TypeMismatchError.name,
        repository: toFso.fs.repository,
        path: toFso.path,
        e: `"${toFso}" is not a file`,
      });
    }
    const to = toFso as AbstractFile;
    try {
      await to.head();
      if (!options.force) {
        throw createError({
          name: SecurityError.name,
          repository: to.fs.repository,
          path: to.path,
        });
      }
    } catch (e) {
      if (e.name !== NotFoundError.name) {
        throw createError({
          name: NotReadableError.name,
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
        await to.head();
        create = false;
      } catch (e) {
        if (e.name === NotFoundError.name) {
          create = true;
        } else {
          throw createError({
            name: NotReadableError.name,
            repository: toFso.fs.repository,
            path: toFso.path,
            e,
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
        throw createError({
          name: TypeMismatchError.name,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" is directory`,
        });
      }
      if (options.create) {
        throw createError({
          name: SecurityError.name,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" has already exists`,
        });
      }
      if (!options.ignoreHook && this.beforePut) {
        ws = await this.beforePut(this.path, options);
      }
    } catch (e) {
      if (e.name === NotFoundError.name) {
        if (!options.ignoreHook && this.beforePost) {
          ws = await this.beforePost(this.path, options);
        }
      } else {
        throw createError({
          name: NotReadableError.name,
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
      const c = new Converter({ bufferSize: options.bufferSize });
      const hash = createHash();
      let result: Source | null;
      while ((result = await rs.read()) != null) {
        const buffer = await c.toUint8Array(result);
        hash.update(buffer);
      }

      return toHex(hash.digest());
    } finally {
      await rs.close();
    }
  }

  public async readAll(
    options: OpenReadOptions = { sourceType: "Uint8Array" }
  ): Promise<Source> {
    const rs = (await this.createReadStream(options)) as AbstractReadStream;
    const type = options.sourceType as SourceType;
    const converter = rs.converter;
    try {
      let pos = 0;
      const chunks: Source[] = [];
      let chunk: Source | null;
      while ((chunk = await rs.read()) != null) {
        pos += getSize(chunk);
        const converted = await this._convert(chunk, type, converter);
        chunks.push(converted);
      }
      return this._joinChunks(chunks, pos, type);
    } finally {
      await rs.close();
    }
  }

  public async writeAll(
    src: Source,
    options: OpenWriteOptions = { append: false, create: true }
  ): Promise<number> {
    const bufferSize = options.bufferSize || DEFAULT_BUFFER_SIZE;
    const ws = (await this.createWriteStream(options)) as AbstractWriteStream;

    if (isBlob(src)) {
      try {
        let pos = 0;
        let chunk: Blob;
        do {
          chunk = src.slice(pos, pos + bufferSize);
          pos += bufferSize;
          if (0 < chunk.size) {
            await ws.write(chunk);
          }
        } while (chunk.size === bufferSize);
      } finally {
        await ws.close();
      }
      return src.size;
    }

    const u8 = await ws.converter.toUint8Array(src);
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
    return u8.byteLength;
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
