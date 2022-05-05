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
  OnNotExist,
  Options,
  ReadOptions,
  Stats,
  WriteOptions,
  XmitOptions,
} from "./core";
import {
  InvalidModificationError,
  isFileSystemError,
  NotFoundError,
  PathExistError,
  TypeMismatchError,
} from "./errors";
import { createModifiedReadableStream, ModifiedReadable, modify } from "./mods";
import { toHex } from "./util";

export abstract class AbstractFile extends AbstractEntry implements File {
  private afterGet?: (path: string, data: Data) => Promise<void>;
  private afterPost?: (path: string) => Promise<void>;
  private afterPut?: (path: string) => Promise<void>;
  private beforeGet?: (
    path: string,
    options: ReadOptions
  ) => Promise<Data | null>;
  private beforePost?: (
    path: string,
    data: Data,
    stats: Stats | undefined,
    options: WriteOptions
  ) => Promise<boolean | null>;
  private beforePut?: (
    path: string,
    data: Data,
    stats: Stats | undefined,
    options: WriteOptions
  ) => Promise<boolean | null>;

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

  public async _delete(options: DeleteOptions): Promise<boolean> {
    try {
      await this._checkFile(options);
    } catch (e) {
      const errors = options.errors;
      if (isFileSystemError(e) && e.name !== NotFoundError.name) {
        if (options.onNotExist === OnNotExist.Error) {
          this.fs._handleFileSystemError(e, options.errors);
          return false;
        }
      } else {
        this._handleNotReadableError(errors, { e });
        return false;
      }
    }

    try {
      await this._rm();
      return true;
    } catch (e) {
      this._handleNoModificationAllowedError(options.errors, { e });
      return false;
    }
  }

  public async _xmit(toEntry: Entry, options: XmitOptions): Promise<boolean> {
    const errors = options.errors;

    if (toEntry instanceof AbstractDirectory) {
      this.fs._handleError(TypeMismatchError.name, this.path, errors, {
        message: `"${toEntry.path}" is not a file`,
        from: this.path,
        to: toEntry.path,
      });
      return false;
    }
    const to = toEntry as AbstractFile;
    let stats: Stats;
    try {
      const s = await to.head({ ...options, type: EntryType.File });
      if (s == null) {
        return false;
      }
      if (options.onExists === OnExists.Ignore) {
        return true;
      }
      stats = s;
      if (options.onExists === OnExists.Error) {
        this.fs._handleError(InvalidModificationError.name, this.path, errors, {
          from: this.path,
          to: toEntry.path,
        });
        return false;
      }
    } catch (e) {
      if (isFileSystemError(e) && e.name === NotFoundError.name) {
        this.fs._handleFileSystemError(e, errors);
      } else {
        this._handleNotReadableError(errors, {
          e: e as ErrorLike,
          from: this.path,
          to: toEntry.path,
        });
      }
      return false;
    }

    const data = await this._read(options, stats);
    if (data == null) {
      return false;
    }

    try {
      const result = await to.write(data, options);
      return result;
    } catch (e) {
      this._handleNotReadableError(errors, {
        e: e as ErrorLike,
        from: this.path,
        to: toEntry.path,
      });
      return false;
    }
  }

  public async hash(options?: ReadOptions): Promise<string | null> {
    options = { ...options };
    const data = await this._read(options);
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

  public head(options?: HeadOptions): Promise<Stats | null> {
    options = { ...options, type: EntryType.File };
    return this.fs.head(this.path, options);
  }

  public async read<T extends DataType>(
    type?: T,
    options?: ReadOptions
  ): Promise<ReturnData<T> | null> {
    options = { ...options };
    const converter = this._getConverter();
    if (options.length === 0) {
      return converter.empty(type);
    }

    const data = await this._read(options);
    if (data === null) {
      return null;
    }
    if (type == null) {
      return data as ReturnData<T>;
    }
    return converter.convert(data, type, options);
  }

  public async write(data: Data, options?: WriteOptions): Promise<boolean> {
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

    const path = this.path;
    const converter = this._getConverter();
    const rc = readableConverter();
    const rsc = readableStreamConverter();
    if (!this.supportAppend() && options.append) {
      options.append = false;
      const head = await this._read({ bufferSize: options.bufferSize });
      if (head == null) {
        return false;
      }
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
      const src = await this._read({ bufferSize: options.bufferSize });
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

    const errors = options.errors;

    options = { ...options };
    let stats: Stats | undefined;
    let create: boolean;
    try {
      stats = await this._checkFile(options);
      if (options?.create) {
        this.fs._handleError(PathExistError.name, this.path, errors);
        return false;
      }
      create = false;
    } catch (e) {
      if (isFileSystemError(e) && e.name === NotFoundError.name) {
        if (options?.create === false) {
          this.fs._handleFileSystemError(e, options.errors);
          return false;
        }
        create = true;
      } else {
        this._handleNotReadableError(errors, { e });
        return false;
      }
    }

    try {
      options = { append: !!options?.append, create };
      if (create) {
        if (this.beforePost) {
          const result = await this.beforePost(path, data, stats, options);
          if (result != null) {
            return result;
          }
        }
      } else {
        if (this.beforePut) {
          const result = await this.beforePut(path, data, stats, options);
          if (result != null) {
            return result;
          }
        }
      }

      await this._save(data, stats, options);

      if (create) {
        if (this.afterPost) {
          this.afterPost(path).catch((e) => console.warn(e));
        }
      } else {
        if (this.afterPut) {
          this.afterPut(path).catch((e) => console.warn(e));
        }
      }
      return true;
    } catch (e) {
      this._handleNoModificationAllowedError(errors, { e });
      return false;
    }
  }

  public abstract supportAppend(): boolean;
  public abstract supportRangeRead(): boolean;
  public abstract supportRangeWrite(): boolean;

  protected async _checkFile(options: Options): Promise<Stats> {
    return (await this.head({
      type: EntryType.File,
      ignoreHook: options.ignoreHook,
    })) as Stats;
  }

  protected _getConverter() {
    return DEFAULT_CONVERTER;
  }

  protected async _read(
    options: ReadOptions,
    stats?: Stats
  ): Promise<Data | null> {
    const ignoreHook = options.ignoreHook;
    if (!stats) {
      const s = await this.head({ ...options, type: EntryType.File });
      if (s == null) {
        return null;
      }
      stats = s;
    }

    const errors = options.errors;

    const path = this.path;
    if (stats.size == null) {
      this.fs._handleError(TypeMismatchError.name, this.path, errors, {
        message: `"${path}" must not end with slash`,
      });
      return null;
    } else if (stats.size === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return this._getConverter().empty() as Data;
    }

    try {
      let data: Data | null = null;
      if (!ignoreHook && this.beforeGet) {
        data = await this.beforeGet(path, options);
      }
      if (!data) {
        data = await this._load(stats, options);
      }
      if (!ignoreHook && this.afterGet) {
        this.afterGet(path, data).catch((e) => console.warn(e));
      }

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
      this._handleNotReadableError(errors, { e });
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
