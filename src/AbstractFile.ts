import { createHash } from "sha256-uint8array";
import {
  BlockSource,
  BlockSourceType,
  Converter,
  converter as defaultConverter,
  handleStreamSource,
  isBrowser,
  Source,
} from "univ-conv";
import { PathExistError } from ".";
import { AbstractEntry } from "./AbstractEntry";
import { AbstractFileSystem } from "./AbstractFileSystem";
import {
  BlockReadOptions,
  DeleteOptions,
  ErrorLike,
  File,
  OpenOptions,
  WriteOptions,
} from "./core";
import {
  createError,
  NotFoundError,
  NotReadableError,
  TypeMismatchError,
} from "./errors";
import { toHex } from "./util";

export abstract class AbstractFile extends AbstractEntry implements File {
  private afterGet?: (path: string, source: Source) => Promise<void>;
  private afterPost?: (path: string, source: Source) => Promise<void>;
  private afterPut?: (path: string, source: Source) => Promise<void>;
  private beforeGet?: (
    path: string,
    options: OpenOptions
  ) => Promise<Source | null>;
  private beforePost?: (
    path: string,
    source: Source,
    options: WriteOptions
  ) => Promise<boolean>;
  private beforePut?: (
    path: string,
    source: Source,
    options: WriteOptions
  ) => Promise<boolean>;

  constructor(fs: AbstractFileSystem, path: string) {
    super(fs, path);
    const hook = fs.options?.hook;
    if (hook) {
      this.beforeGet = hook.beforeGet;
      this.beforePost = hook.beforePost;
      this.beforePut = hook.beforePut;
      this.afterGet = hook.afterGet;
      this.afterPost = hook.afterPost;
      this.afterPut = hook.afterPut;
    }
  }

  public async _convert(
    converter: Converter,
    chunk: Source,
    type: BlockSourceType
  ): Promise<BlockSource> {
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
        return converter.toText(chunk);
    }
  }

  public async _delete(
    options: DeleteOptions,
    _errors: ErrorLike[]
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
        return;
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

  public async hash(options?: OpenOptions): Promise<string> {
    options = options || {};
    const converter = this._getConverter(options.bufferSize);
    const source = await this.getSource(options);
    const streamSource = await converter.toStreamSource(source);

    const hash = createHash();
    await handleStreamSource(streamSource, async (chunk) => {
      const buffer = await converter.toUint8Array(chunk);
      hash.update(buffer);
    });

    return toHex(hash.digest());
  }

  public async readAll(options?: BlockReadOptions): Promise<BlockSource> {
    const type = options?.sourceType ?? (isBrowser ? "Blob" : "Uint8Array");
    options = { sourceType: type };
    const source = await this.getSource(options);
    const converter = this._getConverter(options?.bufferSize);
    return this._convert(converter, source, type);
  }

  public async writeAll(src: Source, options?: WriteOptions): Promise<void> {
    const path = this.path;
    const fs = this.fs;
    const repository = fs.repository;
    let create: boolean;
    try {
      await this.head();
      if (options?.create) {
        throw createError({
          name: PathExistError.name,
          repository,
          path,
        });
      }
      create = false;
    } catch (e) {
      if (e.name === NotFoundError.name) {
        if (options?.create === false) {
          throw createError({
            name: NotFoundError.name,
            repository,
            path,
            e,
          });
        }
        create = true;
      } else {
        throw createError({
          name: NotReadableError.name,
          repository,
          path,
          e,
        });
      }
    }

    options = { append: options?.append ?? false, create };
    if (create) {
      if (this.beforePost) {
        if (await this.beforePost(path, src, options)) {
          return;
        }
      }
    } else {
      if (this.beforePut) {
        if (await this.beforePut(path, src, options)) {
          return;
        }
      }
    }

    await this._writeAll(src, options);

    if (create) {
      if (this.afterPost) {
        this.afterPost(path, src).catch((e) => console.warn(e));
      }
    } else {
      if (this.afterPut) {
        this.afterPut(path, src).catch((e) => console.warn(e));
      }
    }
  }

  protected abstract _getSource(): Promise<Source>;
  protected abstract _rm(): Promise<void>;
  protected abstract _writeAll(
    src: Source,
    options: WriteOptions
  ): Promise<void>;

  private _getConverter(bufferSize?: number) {
    return bufferSize ? new Converter({ bufferSize }) : defaultConverter;
  }

  private async getSource(options: OpenOptions): Promise<Source> {
    const ignoreHook = options.ignoreHook;
    const path = this.path;
    let source: Source | null = null;
    if (!ignoreHook && this.beforeGet) {
      source = await this.beforeGet(path, options);
    }
    if (!source) {
      source = await this._getSource();
    }
    if (!ignoreHook && this.afterGet) {
      this.afterGet(path, source).catch((e) => console.warn(e));
    }
    return source;
  }
}
