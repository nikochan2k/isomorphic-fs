import { createHash } from "sha256-uint8array";
import {
  Converter,
  converter as defaultConverter,
  Data,
  DataType,
  handleReadableStreamData,
  isBrowser,
  ReturnDataType,
} from "univ-conv";
import { AbstractDirectory } from "./AbstractDirectory";
import { AbstractEntry } from "./AbstractEntry";
import { AbstractFileSystem } from "./AbstractFileSystem";
import {
  DeleteOptions,
  ErrorLike,
  File,
  OpenOptions,
  ReadOptions,
  WriteOptions,
  XmitOptions,
} from "./core";
import {
  createError,
  NotFoundError,
  NotReadableError,
  PathExistError,
  SecurityError,
  TypeMismatchError,
} from "./errors";
import { toHex } from "./util";

export abstract class AbstractFile extends AbstractEntry implements File {
  private afterGet?: (path: string, data: Data) => Promise<void>;
  private afterPost?: (path: string, data: Data) => Promise<void>;
  private afterPut?: (path: string, data: Data) => Promise<void>;
  private beforeGet?: (
    path: string,
    options: OpenOptions
  ) => Promise<Data | null>;
  private beforePost?: (
    path: string,
    data: Data,
    options: WriteOptions
  ) => Promise<boolean>;
  private beforePut?: (
    path: string,
    data: Data,
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
      const stats = await this.head(options);
      if (stats.size == null) {
        throw createError({
          name: TypeMismatchError.name,
          repository: this.fs.repository,
          path: this.path,
          e: { message: `"${this.path}" is not a file` },
        });
      }
    } catch (e: unknown) {
      if ((e as ErrorLike).name === NotFoundError.name) {
        if (!options.force) {
          throw e;
        }
        return;
      } else {
        throw createError({
          name: NotReadableError.name,
          repository: this.fs.repository,
          path: this.path,
          e: e as ErrorLike,
        });
      }
    }

    return this._rm();
  }

  public async _xmit(
    toEntry: AbstractEntry,
    _copyErrors: ErrorLike[],
    options: XmitOptions
  ): Promise<void> {
    if (toEntry instanceof AbstractDirectory) {
      throw createError({
        name: TypeMismatchError.name,
        repository: toEntry.fs.repository,
        path: toEntry.path,
        e: { message: `"${toEntry.path}" is not a file` },
      });
    }
    const to = toEntry as AbstractFile;
    try {
      await to.head(options);
      if (!options.force) {
        throw createError({
          name: SecurityError.name,
          repository: to.fs.repository,
          path: to.path,
        });
      }
    } catch (e: unknown) {
      if ((e as ErrorLike).name !== NotFoundError.name) {
        throw createError({
          name: NotReadableError.name,
          repository: to.fs.repository,
          path: to.path,
          e: e as ErrorLike,
        });
      }
    }

    const data = await this.getData(options);
    await to.write(data, options);
  }

  public async hash(options?: OpenOptions): Promise<string> {
    options = options || {};
    const converter = this._getConverter(options.bufferSize);
    const data = await this.getData(options);
    const streamData = await converter.toReadableStreamData(data);

    const hash = createHash();
    await handleReadableStreamData(streamData, async (chunk) => {
      const buffer = await converter.toUint8Array(chunk as Data);
      hash.update(buffer);
    });

    return toHex(hash.digest());
  }

  public async read<T extends DataType>(
    options?: ReadOptions<T>
  ): Promise<ReturnDataType<T>> {
    options = { ...options };
    options.type = (options.type ?? (isBrowser ? "Blob" : "Uint8Array")) as T;
    const data = await this.getData(options);
    const converter = this._getConverter(options?.bufferSize);
    return converter.convert(data, options.type);
  }

  public async write(data: Data, options?: WriteOptions): Promise<void> {
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
        if (await this.beforePost(path, data, options)) {
          return;
        }
      }
    } else {
      if (this.beforePut) {
        if (await this.beforePut(path, data, options)) {
          return;
        }
      }
    }

    await this._save(data, options);

    if (create) {
      if (this.afterPost) {
        this.afterPost(path, data).catch((e) => console.warn(e));
      }
    } else {
      if (this.afterPut) {
        this.afterPut(path, data).catch((e) => console.warn(e));
      }
    }
  }

  protected _getConverter(bufferSize?: number) {
    return bufferSize ? new Converter({ bufferSize }) : defaultConverter;
  }

  protected abstract _load(options: OpenOptions): Promise<Data>;
  protected abstract _rm(): Promise<void>;
  protected abstract _save(data: Data, options: WriteOptions): Promise<void>;

  private async getData(options: OpenOptions): Promise<Data> {
    const ignoreHook = options.ignoreHook;
    const path = this.path;
    let data: Data | null = null;
    if (!ignoreHook && this.beforeGet) {
      data = await this.beforeGet(path, options);
    }
    if (!data) {
      data = await this._load(options);
    }
    if (!ignoreHook && this.afterGet) {
      this.afterGet(path, data).catch((e) => console.warn(e));
    }
    return data;
  }
}
