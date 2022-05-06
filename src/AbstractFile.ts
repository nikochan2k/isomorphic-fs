import { createHash } from "sha256-uint8array";
import {
  bufferConverter,
  Data,
  DataType,
  DEFAULT_CONVERTER,
  handleReadable,
  handleReadableStream,
  isBrowser,
  isNode,
  readableConverter,
  readableStreamConverter,
  ReturnData,
  uint8ArrayConverter,
} from "univ-conv";
import { HeadOptions } from ".";
import { AbstractDirectory } from "./AbstractDirectory";
import { AbstractEntry } from "./AbstractEntry";
import { AbstractFileSystem } from "./AbstractFileSystem";
import {
  DeleteOptions,
  Entry,
  EntryType,
  ErrorLike,
  File,
  OnExists,
  Options,
  ReadOptions,
  Stats,
  WriteOptions,
  XmitOptions,
} from "./core";
import {
  FileSystemError,
  InvalidModificationError,
  isFileSystemError,
  NotFoundError,
  PathExistError,
  TypeMismatchError,
} from "./errors";
import { createModifiedReadableStream, ModifiedReadable, modify } from "./mods";
import { toHex } from "./util";

export abstract class AbstractFile extends AbstractEntry implements File {
  constructor(fs: AbstractFileSystem, path: string) {
    super(fs, path);
  }

  public async _copy(
    toEntry: Entry,
    options: XmitOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    if (toEntry instanceof AbstractDirectory) {
      await this.fs._handleError(TypeMismatchError.name, this.path, errors, {
        message: `"${toEntry.path}" is not a file`,
        from: this.path,
        to: toEntry.path,
      });
      return false;
    }

    const to = toEntry as AbstractFile;
    let stats: Stats | undefined;
    try {
      stats = await to.head({ ...options, type: EntryType.File });
      if (options.onExists === OnExists.Ignore) {
        return true;
      }
      if (options.onExists === OnExists.Error) {
        await this.fs._handleError(
          InvalidModificationError.name,
          this.path,
          errors,
          {
            from: this.path,
            to: toEntry.path,
          }
        );
        return false;
      }
    } catch (e) {
      if (!(isFileSystemError(e) && e.name === NotFoundError.name)) {
        await this._handleNotReadableError(errors, {
          e: e as ErrorLike,
          from: this.path,
          to: toEntry.path,
        });
        return false;
      }
    }

    const data = await this._read(options, stats, errors);
    if (data == null) {
      return false;
    }

    return to.write(data, options, errors);
  }

  public async _delete(
    _options: DeleteOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    try {
      await this._rm();
      return true;
    } catch (e) {
      await this._handleNoModificationAllowedError(errors, { e });
      return false;
    }
  }

  public hash(options?: ReadOptions): Promise<string>;
  public hash(
    options?: ReadOptions,
    errors?: FileSystemError[]
  ): Promise<string | null>;
  public async hash(
    options?: ReadOptions,
    errors?: FileSystemError[]
  ): Promise<string | null> {
    options = { ...options };
    const data = await this._read(options, undefined, errors);
    if (data == null) {
      return null;
    }

    const hash = createHash();
    if (readableConverter().typeEquals(data)) {
      await handleReadable(data, async (chunk) => {
        const buffer = await bufferConverter().convert(chunk, {
          bufferSize: options?.bufferSize,
        });
        hash.update(buffer);
        return true;
      });
    } else if (readableStreamConverter().typeEquals(data)) {
      await handleReadableStream(data, async (chunk) => {
        const u8 = await uint8ArrayConverter().convert(chunk, {
          bufferSize: options?.bufferSize,
        });
        hash.update(u8);
        return true;
      });
    } else {
      const u8 = await uint8ArrayConverter().convert(data);
      hash.update(u8);
    }

    return toHex(hash.digest());
  }

  public head(options?: HeadOptions): Promise<Stats>;
  public head(
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null>;
  public head(
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null> {
    options = { ...options, type: EntryType.File };
    return this.fs.head(this.path, options, errors);
  }

  public async read<T extends DataType>(
    type?: T,
    options?: ReadOptions
  ): Promise<ReturnData<T>>;
  public async read<T extends DataType>(
    type?: T,
    options?: ReadOptions,
    errors?: FileSystemError[]
  ): Promise<ReturnData<T> | null>;
  public async read<T extends DataType>(
    type?: T,
    options?: ReadOptions,
    errors?: FileSystemError[]
  ): Promise<ReturnData<T> | null> {
    options = { ...options };
    const converter = this._getConverter();
    if (options.length === 0) {
      return converter.empty(type);
    }

    const data = await this._read(options, undefined, errors);
    if (data === null) {
      return null;
    }
    if (type == null) {
      return data as ReturnData<T>;
    }
    return converter.convert(data, type, options);
  }

  public async write(
    data: Data,
    options?: WriteOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    options = { ...options };
    const length = options.length;
    if (length === 0) {
      return false;
    }

    const start = options.start;
    if (options.append && start != null) {
      options.append = false;
      console.warn(
        "Set options.append to false because options.start is not null."
      );
    }

    const rc = readableConverter();
    const rsc = readableStreamConverter();
    if (!this.supportAppend() && options.append) {
      options.append = false;
      const head = await this._read(
        { bufferSize: options.bufferSize },
        undefined,
        errors
      );
      if (head == null) {
        return false;
      }
      const converter = this._getConverter();
      if (rc.typeEquals(head) || rc.typeEquals(data)) {
        data = await converter.merge([head, data], "readable");
      } else if (rsc.typeEquals(head) || rsc.typeEquals(data)) {
        data = await converter.merge([head, data], "readablestream");
      } else if (isBrowser) {
        data = await converter.merge([head, data], "blob");
      } else if (isNode) {
        data = await converter.merge([head, data], "buffer");
      } else {
        data = await converter.merge([head, data], "uint8array");
      }
    } else if (
      !this.supportRangeWrite() &&
      (typeof start === "number" || typeof length === "number")
    ) {
      delete options.start;
      delete options.length;
      const src = await this._read(
        { bufferSize: options.bufferSize },
        undefined,
        errors
      );
      if (src === null) {
        return false;
      }
      if (rc.typeEquals(src)) {
        data = new ModifiedReadable(src, { data, start, length });
      } else if (rsc.typeEquals(src)) {
        data = createModifiedReadableStream(src, { data, start, length });
      } else {
        data = await modify(src, { data, start, length });
      }
    }

    options = { ...options };
    let stats: Stats | undefined;
    let create: boolean;
    try {
      stats = await this._exists(options);
      if (options?.create) {
        await this.fs._handleError(PathExistError.name, this.path, errors);
        return false;
      }
      create = false;
    } catch (e) {
      if (isFileSystemError(e) && e.name === NotFoundError.name) {
        if (options?.create === false) {
          await this.fs._handleFileSystemError(e, errors);
          return false;
        }
        create = true;
      } else {
        await this._handleNotReadableError(errors, { e });
        return false;
      }
    }

    try {
      options = { append: !!options?.append, create };
      if (create) {
        const result = await this._beforePost(data, options);
        if (result != null) {
          return result;
        }
      } else {
        const result = await this._beforePut(data, options);
        if (result != null) {
          return result;
        }
      }

      await this._save(data, stats, options);

      if (create) {
        await this._afterPost(options, true);
      } else {
        await this._afterPut(options, true);
      }
      return true;
    } catch (e) {
      const opts = options;
      await this._handleNoModificationAllowedError(
        errors,
        { e },
        async (error) => {
          if (create) {
            await this._afterPost(opts, false, error);
          } else {
            await this._afterPut(opts, false, error);
          }
        }
      );
      return false;
    }
  }

  public abstract supportAppend(): boolean;
  public abstract supportRangeRead(): boolean;
  public abstract supportRangeWrite(): boolean;

  protected async _afterGet(
    options: ReadOptions,
    data: Data | null,
    error?: FileSystemError
  ) {
    const fs = this.fs;
    const afterGet = fs.options.hook?.afterGet;
    if (afterGet && !options.ignoreHook) {
      await afterGet(fs.repository, this.path, options, data, error);
    }
  }

  protected async _afterPost(
    options: WriteOptions,
    result: boolean,
    error?: FileSystemError
  ) {
    const fs = this.fs;
    const afterPost = fs.options.hook?.afterPost;
    if (afterPost && !options.ignoreHook) {
      await afterPost(fs.repository, this.path, options, result, error);
    }
  }

  protected async _afterPut(
    options: WriteOptions,
    result: boolean,
    error?: FileSystemError
  ) {
    const fs = this.fs;
    const afterPut = fs.options.hook?.afterPut;
    if (afterPut && !options.ignoreHook) {
      await afterPut(fs.repository, this.path, options, result, error);
    }
  }

  protected _beforeGet(options: ReadOptions) {
    const fs = this.fs;
    const beforeGet = fs.options.hook?.beforeGet;
    if (beforeGet && !options.ignoreHook) {
      return beforeGet(fs.repository, this.path, options);
    }
    return null;
  }

  protected async _beforePost(data: Data, options: WriteOptions) {
    const fs = this.fs;
    const beforePost = fs.options.hook?.beforePost;
    if (beforePost && !options.ignoreHook) {
      await beforePost(fs.repository, this.path, data, options);
    }
  }

  protected async _beforePut(data: Data, options: WriteOptions) {
    const fs = this.fs;
    const beforePut = fs.options.hook?.beforePut;
    if (beforePut && !options.ignoreHook) {
      await beforePut(fs.repository, this.path, data, options);
    }
  }

  protected async _exists(options: Options): Promise<Stats> {
    return this.head({
      type: EntryType.File,
      ignoreHook: options.ignoreHook,
    });
  }

  protected _getConverter() {
    return DEFAULT_CONVERTER;
  }

  protected async _read(options: ReadOptions, stats?: Stats): Promise<Data>;
  protected async _read(
    options: ReadOptions,
    stats?: Stats,
    errors?: FileSystemError[]
  ): Promise<Data | null>;
  protected async _read(
    options: ReadOptions,
    stats?: Stats,
    errors?: FileSystemError[]
  ): Promise<Data | null> {
    if (!stats) {
      const s = await this.head({ ...options, type: EntryType.File });
      if (s == null) {
        return null;
      }
      stats = s;
    }

    const path = this.path;
    if (stats.size == null) {
      await this.fs._handleError(TypeMismatchError.name, this.path, errors, {
        message: `"${path}" must not end with slash`,
      });
      return null;
    } else if (stats.size === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return this._getConverter().empty() as Data;
    }

    try {
      let data = await this._beforeGet(options);
      if (!data) {
        data = await this._load(stats, options);
      }
      await this._afterGet(options, data);

      if (
        data &&
        !this.supportRangeRead() &&
        (typeof options?.start === "number" ||
          typeof options?.length === "number")
      ) {
        data = await DEFAULT_CONVERTER.slice(data, options); // eslint-disable-line
      }

      return data;
    } catch (e) {
      const opts = options;
      await this._handleNotReadableError(errors, { e }, async (error) => {
        await this._afterGet(opts, null, error);
      });
      return null;
    }
  }

  protected abstract _load(stats: Stats, options: ReadOptions): Promise<Data>;
  protected abstract _rm(): Promise<void>;
  protected abstract _save(
    data: Data,
    stats: Stats | undefined,
    options: WriteOptions
  ): Promise<void>;
}
