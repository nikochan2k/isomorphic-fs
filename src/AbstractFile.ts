import { createHash } from "sha256-uint8array";
import { Converter, isBlob, validateBufferSize } from "univ-conv";
import { AbstractDirectory } from "./AbstractDirectory";
import { AbstractEntry } from "./AbstractEntry";
import { AbstractFileSystem } from "./AbstractFileSystem";
import { AbstractReadStream } from "./AbstractReadStream";
import { AbstractWriteStream } from "./AbstractWriteStream";
import {
  Entry,
  File,
  OpenOptions,
  OpenReadOptions,
  OpenWriteOptions,
  ReadStream,
  Ret,
  Ret2,
  Source,
  SourceType,
  Stats,
  UnlinkOptions,
  WriteStream,
  XmitOptions,
} from "./core";
import {
  createError,
  NotFoundError,
  NotReadableError,
  SecurityError,
  TypeMismatchError,
} from "./errors";
import { toHex } from "./util";

export abstract class AbstractFile extends AbstractEntry implements File {
  private beforeGet?: (
    path: string,
    options: OpenOptions
  ) => Promise<Ret<ReadStream> | null>;
  private beforePost?: (
    path: string,
    options: OpenWriteOptions
  ) => Promise<Ret<WriteStream> | null>;
  private beforePut?: (
    path: string,
    options: OpenWriteOptions
  ) => Promise<Ret<WriteStream> | null>;

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

  public async _delete(options: UnlinkOptions): Promise<void> {
    let [stats, e] = await this.head({ ignoreHook: options.ignoreHook });
    if (e) {
      if (e.name === NotFoundError.name) {
        if (!options.force) {
          options.errors.push(e);
          return;
        }
      } else {
        options.errors.push(e);
        return;
      }
    }
    if (stats.size == null) {
      options.errors.push(
        createError({
          name: TypeMismatchError.name,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" is not a file`,
        })
      );
    }

    const [deleted, errors] = await this._unlink();
    options.deleted += deleted;
    Array.prototype.push.apply(options.errors, errors);
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

  public async _xmit(toEntry: Entry, options: XmitOptions): Promise<void> {
    if (toEntry instanceof AbstractDirectory) {
      options.errors.push(
        createError({
          name: TypeMismatchError.name,
          repository: toEntry.fs.repository,
          path: toEntry.path,
          e: `"${toEntry}" is not a file`,
        })
      );
      return;
    }
    const to = toEntry as unknown as AbstractFile;
    const [, eHead] = await to.head();
    if (eHead) {
      if (eHead.name !== NotFoundError.name) {
        options.errors.push(
          createError({
            name: NotReadableError.name,
            repository: to.fs.repository,
            path: to.path,
            e: eHead,
          })
        );
        return;
      }
    }
    if (!options.force) {
      options.errors.push(
        createError({
          name: SecurityError.name,
          repository: to.fs.repository,
          path: to.path,
        })
      );
      return;
    }

    let [rs, eRS] = await this.createReadStream({
      bufferSize: options.bufferSize,
    });
    if (eRS) {
      options.errors.push(eRS);
      return;
    }

    try {
      const [ws, eWS] = await to.createWriteStream({
        append: false,
        bufferSize: options.bufferSize,
      });
      if (!ws) {
        if (eWS) options.errors.push(eWS);
        return;
      }
      try {
        const ePipe = await rs.pipe(ws);
        if (ePipe) {
          options.errors.push(ePipe);
          return;
        }
        options.copied++;
      } finally {
        await ws.close();
      }
    } finally {
      await rs.close();
    }

    if (options.move) {
      const [, errors] = await this.delete({
        force: options.force,
        recursive: options.recursive,
      });
      if (errors) {
        Array.prototype.push.apply(options.errors, errors);
        return;
      }
      options.moved++;
    }
  }

  public async createReadStream(
    options: OpenOptions = {}
  ): Promise<Ret<ReadStream>> {
    if (!options.ignoreHook && this.beforeGet) {
      const result = await this.beforeGet(this.path, options);
      if (result) return result;
    }
    return this._createReadStream(options);
  }

  public async createWriteStream(
    options: OpenWriteOptions = { append: false }
  ): Promise<Ret<WriteStream>> {
    let [stats, e] = await this.head({ ignoreHook: options.ignoreHook });
    if (e) {
      if (e.name === NotFoundError.name) {
        if (options.create == null) options.create = true;
        if (options.create === false) return [undefined as never, e];
        if (!options.ignoreHook && this.beforePost) {
          const result = await this.beforePost(this.path, options);
          if (result) {
            return result;
          }
        }
      } else {
        return [
          undefined as never,
          createError({
            name: NotReadableError.name,
            repository: this.fs.repository,
            path: this.path,
            e,
          }),
        ];
      }
    }
    stats = stats as Stats;
    if (stats.size == null) {
      return [
        undefined as never,
        createError({
          name: TypeMismatchError.name,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" is directory`,
        }),
      ];
    }
    if (options.create == null) options.create = false;
    if (options.create === true) {
      return [
        undefined as never,
        createError({
          name: SecurityError.name,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" has already exists`,
        }),
      ];
    }
    if (!options.ignoreHook && this.beforePut) {
      const result = await this.beforePut(this.path, options);
      if (result) return result;
    }
    return this._createWriteStream(options);
  }

  public async hash(options: OpenOptions = {}): Promise<Ret<string>> {
    let [rs, e] = await this.createReadStream(options);
    if (e) return [undefined as never, e];
    try {
      const c = new Converter({ bufferSize: options.bufferSize });
      const hash = createHash();
      while (true) {
        const ret = await rs.read();
        const [chunk, e] = ret;
        if (e) return [undefined as never, e];
        if (!chunk) break;
        const buffer = await c.toUint8Array(chunk);
        hash.update(buffer);
      }

      return [toHex(hash.digest()), undefined as never];
    } finally {
      await rs.close();
    }
  }

  public async readAll(
    options: OpenReadOptions = { sourceType: "Uint8Array" }
  ): Promise<Ret<Source>> {
    validateBufferSize(options);
    let [rs, e] = await this.createReadStream(options);
    if (e) return [undefined as never, e];
    const type = options.sourceType as SourceType;
    const converter = (rs as AbstractReadStream).converter;
    try {
      let pos = 0;
      const chunks: Source[] = [];
      while (true) {
        const [chunk, e] = await rs.read();
        if (e) return [undefined as never, e];
        if (!chunk) break;
        const converted = await this._convert(chunk, type, converter);
        chunks.push(converted);
      }
      const joined = await this._joinChunks(chunks, pos, type);
      return [joined, undefined as never];
    } finally {
      await rs.close();
    }
  }

  public async writeAll(
    src: Source,
    options: OpenWriteOptions = { append: false }
  ): Promise<Ret<number>> {
    const bufferSize = validateBufferSize(options);
    let [ws, e] = await this.createWriteStream(options);
    if (e) return [undefined as never, e];
    ws = ws as WriteStream;
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
      return [src.size, undefined as never];
    }

    const converter = (ws as AbstractWriteStream).converter;
    const u8 = await converter.toUint8Array(src);
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
    return [u8.byteLength, undefined as never];
  }

  public abstract _createReadStream(
    options: OpenOptions
  ): Promise<Ret<ReadStream>>;
  public abstract _createWriteStream(
    options: OpenWriteOptions
  ): Promise<Ret<WriteStream>>;
  public abstract _unlink(): Promise<Ret2<number>>;

  protected _createBuffer(byteLength: number): Uint8Array {
    const ab = new ArrayBuffer(byteLength);
    return new Uint8Array(ab);
  }
}
