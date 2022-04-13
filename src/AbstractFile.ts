import { createHash } from "sha256-uint8array";
import {
  bufferConverter,
  Data,
  DataType,
  DEFAULT_CONVERTER,
  handleReadable,
  handleReadableStream,
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
  EntryType,
  ErrorLike,
  File,
  Options,
  ReadOptions,
  Stats,
  WriteOptions,
  XmitOptions,
} from "./core";
import {
  createError,
  isFileSystemException,
  NotFoundError,
  NotReadableError,
  NotSupportedError,
  PathExistError,
  SecurityError,
  TypeMismatchError,
} from "./errors";
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
  ) => Promise<boolean>;
  private beforePut?: (
    path: string,
    data: Data,
    stats: Stats | undefined,
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

  public async _delete(
    options: DeleteOptions,
    _errors: ErrorLike[] // eslint-disable-line
  ): Promise<void> {
    try {
      await this._checkFile(options);
    } catch (e) {
      if ((e as ErrorLike).name === NotFoundError.name) {
        if (!options.force) {
          throw e;
        }
        return;
      }
      throw createError({
        name: NotReadableError.name,
        repository: this.fs.repository,
        path: this.path,
        e: e as ErrorLike,
      });
    }

    return this._rm();
  }

  public async _xmit(
    toEntry: AbstractEntry,
    errors: ErrorLike[],
    options: XmitOptions
  ): Promise<void> {
    if (toEntry instanceof AbstractDirectory) {
      errors.push(
        createError({
          name: TypeMismatchError.name,
          repository: toEntry.fs.repository,
          path: toEntry.path,
          e: { message: `"${toEntry.path}" is not a file` },
          from: this.path,
          to: toEntry.path,
        })
      );
      return;
    }
    const to = toEntry as AbstractFile;
    let stats: Stats | undefined;
    try {
      stats = await to.head(options);
      if (!options.force) {
        errors.push(
          createError({
            name: SecurityError.name,
            repository: to.fs.repository,
            path: to.path,
            from: this.path,
            to: toEntry.path,
          })
        );
        return;
      }
    } catch (e) {
      if ((e as ErrorLike).name !== NotFoundError.name) {
        errors.push(
          createError({
            name: NotReadableError.name,
            repository: to.fs.repository,
            path: to.path,
            e: e as ErrorLike,
            from: this.path,
            to: toEntry.path,
          })
        );
        return;
      }
    }

    try {
      const data = await this._read(options, stats);
      await to.write(data, options);
    } catch (e) {
      errors.push(
        createError({
          name: NotReadableError.name,
          repository: to.fs.repository,
          path: to.path,
          e: e as ErrorLike,
          from: this.path,
          to: toEntry.path,
        })
      );
    }
  }

  public async hash(options?: ReadOptions): Promise<string> {
    options = { ...options };
    const data = await this._read(options);
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

  public head(options?: HeadOptions): Promise<Stats> {
    options = { ...options, type: EntryType.File };
    return this.fs.head(this.path, options);
  }

  public async read<T extends DataType>(
    type: T,
    options?: ReadOptions
  ): Promise<ReturnData<T>> {
    options = { ...options };
    const data = await this._read(options);
    const converter = this._getConverter();
    return converter.convert(data, type, options);
  }

  public async write(data: Data, options?: WriteOptions): Promise<void> {
    const path = this.path;
    const fs = this.fs;
    const repository = fs.repository;
    if (
      !this.supportRangeWrite() &&
      (typeof options?.start === "number" ||
        typeof options?.length === "number")
    ) {
      throw createError({
        name: NotSupportedError.name,
        repository,
        path,
        e: { message: "Range write is not supported" },
      });
    }

    options = { ...options };
    let stats: Stats | undefined;
    let create: boolean;
    try {
      stats = await this._checkFile(options);
      if (options?.create) {
        throw createError({
          name: PathExistError.name,
          repository,
          path,
        });
      }
      create = false;
    } catch (e: unknown) {
      if ((e as ErrorLike).name === NotFoundError.name) {
        if (options?.create === false) {
          throw createError({
            name: NotFoundError.name,
            repository,
            path,
            e: e as ErrorLike,
          });
        }
        create = true;
      } else if (isFileSystemException(e)) {
        throw e;
      } else {
        throw createError({
          name: NotReadableError.name,
          repository,
          path,
          e: e as ErrorLike,
        });
      }
    }

    options = { append: !!options?.append, create };
    if (create) {
      if (this.beforePost) {
        if (await this.beforePost(path, data, stats, options)) {
          return;
        }
      }
    } else {
      if (this.beforePut) {
        if (await this.beforePut(path, data, stats, options)) {
          return;
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
  }

  public abstract supportRangeRead(): boolean;
  public abstract supportRangeWrite(): boolean;

  protected async _checkFile(options: Options) {
    const path = this.path;
    const stats = await this.fs.head(path, options);
    if (stats.size == null) {
      throw createError({
        name: TypeMismatchError.name,
        repository: this.fs.repository,
        path,
        e: { message: `"${path}" is not a file` },
      });
    }
    return stats;
  }

  protected _getConverter() {
    return DEFAULT_CONVERTER;
  }

  protected async _read(options: ReadOptions, stats?: Stats): Promise<Data> {
    const fs = this.fs;
    const repository = fs.repository;
    const path = this.path;
    if (
      !this.supportRangeRead() &&
      (typeof options?.start === "number" ||
        typeof options?.length === "number")
    ) {
      throw createError({
        name: NotSupportedError.name,
        repository,
        path,
        e: { message: "Range read is not supported" },
      });
    }

    const ignoreHook = options.ignoreHook;
    if (!stats) {
      stats = await this.head(options);
    }
    if (stats.size == null) {
      throw createError({
        name: TypeMismatchError.name,
        repository: this.fs.repository,
        path,
        e: { message: `"${path}" must not end with slash` },
      });
    } else if (stats.size === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return this._getConverter().empty() as Data;
    }
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
    return data;
  }

  protected abstract _load(stats: Stats, options: ReadOptions): Promise<Data>;
  protected abstract _rm(): Promise<void>;
  protected abstract _save(
    data: Data,
    stats: Stats | undefined,
    options: WriteOptions
  ): Promise<void>;
}
