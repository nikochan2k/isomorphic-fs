import { createHash } from "sha256-uint8array";
import { NotFoundError } from "./errors";
import { toUint8Array } from "./util/buffer";
import { toHex } from "./util/misc";
import { getParentPath } from "./util/path";

export interface BeforeInterceptor {
  beforeCopy?: (fso: FileSystemObject, toPath: string) => Promise<boolean>;
  beforeDelete?: (
    fso: FileSystemObject,
    options?: DeleteOptions
  ) => Promise<boolean>;
  beforeGet?: (file: File, options?: OpenOptions) => Promise<ReadStream | null>;
  beforeHead?: (fso: FileSystemObject) => Promise<Stats | null>;
  beforeList?: (dir: Directory) => Promise<string[] | null>;
  beforeMkcol?: (
    dir: Directory,
    options?: MakeDirectoryOptions
  ) => Promise<boolean>;
  beforeMove?: (fso: FileSystemObject, toPath: string) => Promise<boolean>;
  beforePatch?: (fso: FileSystemObject, props: Props) => Promise<boolean>;
  beforePost?: (
    file: File,
    options?: OpenOptions
  ) => Promise<WriteStream | null>;
  beforePut?: (
    file: File,
    options?: OpenOptions
  ) => Promise<WriteStream | null>;
}

export interface AfterInterceptor {
  afterCopy?: (fso: FileSystemObject, toPath: string) => Promise<void>;
  afterDelete?: (fso: FileSystemObject) => Promise<void>;
  afterGet?: (file: File, rs: ReadStream) => Promise<void>;
  afterHead?: (fso: FileSystemObject, stats: Stats) => Promise<void>;
  afterList?: (dir: Directory, list: string[]) => Promise<void>;
  afterMkcol?: (dir: Directory) => Promise<void>;
  afterMove?: (fso: FileSystemObject, toPath: string) => Promise<void>;
  afterPatch?: (fso: FileSystemObject) => Promise<void>;
  afterPost?: (file: File, ws: WriteStream) => Promise<void>;
  afterPut?: (file: File, ws: WriteStream) => Promise<void>;
}

export interface Times {
  accessed?: number;
  created?: number;
  deleted?: number;
  modified?: number;
}

export interface Props extends Times {
  [name: string]: any;
}

export interface Stats extends Props {
  size?: number;
}

export interface FileSystemOptions {
  afterInterceptor?: AfterInterceptor;
  beforeInterceptor?: BeforeInterceptor;
}

export abstract class FileSystem {
  constructor(
    public readonly repository: string,
    public readonly options: FileSystemOptions = {}
  ) {}

  /**
   * Get a directory.
   * @param path A path to a directory.
   * @param options
   */
  public abstract getDirectory(path: string): Promise<Directory>;
  /**
   * Get a file.
   * @param path A path to a file.
   * @param options
   */
  public abstract getFile(path: string, options?: OpenOptions): Promise<File>;
}

export type URLType = "GET" | "POST" | "PUT" | "DELETE";

export interface DeleteOptions {
  /**
   * When `true`, exceptions will be ignored if `path` does not exist.
   * @default false
   */
  force?: boolean;
  /**
   * If `true`, perform a recursive directory removal. In
   * recursive mode, errors are not reported if `path` does not exist, and
   * operations are retried on failure.
   * @default false
   */
  recursive?: boolean;
}

export abstract class FileSystemObject {
  private afterCopy?: (fso: FileSystemObject, toPath: string) => Promise<void>;
  private afterDelete?: (fso: FileSystemObject) => Promise<void>;
  private afterHead?: (fso: FileSystemObject, stats: Stats) => Promise<void>;
  private afterMove?: (fso: FileSystemObject, toPath: string) => Promise<void>;
  private afterPatch?: (fso: FileSystemObject) => Promise<void>;
  private beforeCopy?: (
    fso: FileSystemObject,
    toPath: string
  ) => Promise<boolean>;
  private beforeDelete?: (
    fso: FileSystemObject,
    options?: DeleteOptions
  ) => Promise<boolean>;
  private beforeHead?: (fso: FileSystemObject) => Promise<Stats | null>;
  private beforeMove?: (
    fso: FileSystemObject,
    toPath: string
  ) => Promise<boolean>;
  private beforePatch?: (
    fso: FileSystemObject,
    props: Props
  ) => Promise<boolean>;

  constructor(public readonly fs: FileSystem, public path: string) {
    const bi = fs.options?.beforeInterceptor;
    if (bi) {
      this.beforeHead = bi.beforeHead;
      this.beforeDelete = bi.beforeDelete;
      this.beforePatch = bi.beforePatch;
      this.beforeMove = bi.beforeMove;
      this.beforeCopy = bi.beforeCopy;
    }

    const ai = fs.options?.afterInterceptor;
    if (ai) {
      this.afterHead = ai.afterHead;
      this.afterDelete = ai.afterDelete;
      this.afterPatch = ai.afterPatch;
      this.afterMove = ai.afterMove;
      this.afterCopy = ai.afterCopy;
    }
  }

  public async copy(toPath: string): Promise<void> {
    if (this.beforeCopy) {
      if (await this.beforeCopy(this, toPath)) {
        return;
      }
    }
    await this._copy(toPath);
    this.path = toPath;
    if (this.afterCopy) {
      await this.afterCopy(this, toPath);
    }
  }

  public async delete(options?: DeleteOptions): Promise<void> {
    if (this.beforeDelete) {
      if (await this.beforeDelete(this, options)) {
        return;
      }
    }
    await this._delete(options);
    if (this.afterDelete) {
      await this.afterDelete(this);
    }
  }

  public async getParent(): Promise<string> {
    return getParentPath(this.path);
  }

  public async head(): Promise<Stats> {
    let stats: Stats | null | undefined;
    if (this.beforeHead) {
      stats = await this.beforeHead(this);
    }
    if (!stats) {
      stats = await this._head();
    }
    if (this.afterHead) {
      await this.afterHead(this, stats);
    }
    return stats;
  }

  public async move(toPath: string): Promise<void> {
    if (this.beforeMove) {
      if (await this.beforeMove(this, toPath)) {
        return;
      }
    }
    await this._move(toPath);
    this.path = toPath;
    if (this.afterMove) {
      await this.afterMove(this, toPath);
    }
  }

  public async patch(props: Props): Promise<void> {
    if (this.beforePatch) {
      if (await this.beforePatch(this, props)) {
        return;
      }
    }
    await this._patch(props);
    if (this.afterPatch) {
      await this.afterPatch(this);
    }
  }

  /**
   * Asynchronously removes files and directories (modeled on the standard POSIX `rm` utility).
   */
  public async rm(options?: DeleteOptions): Promise<void> {
    return this.delete(options);
  }

  public stat(): Promise<Stats> {
    return this.head();
  }

  public abstract _copy(toPath: string): Promise<void>;
  public abstract _delete(options?: DeleteOptions): Promise<void>;
  public abstract _head(): Promise<Stats>;
  public abstract _move(toPath: string): Promise<void>;
  public abstract _patch(props: Props): Promise<void>;
  public abstract toURL(urlType?: URLType): Promise<string>;
}

export interface MakeDirectoryOptions {
  /**
   * Indicates whether parent folders should be created.
   * If a folder was created, the path to the first created folder will be returned.
   * @default false
   */
  recursive?: boolean;
}

export abstract class Directory extends FileSystemObject {
  private afterList?: (dir: Directory, list: string[]) => Promise<void>;
  private afterMkcol?: (dir: Directory) => Promise<void>;
  private beforeList?: (dir: Directory) => Promise<string[] | null>;
  private beforeMkcol?: (
    dir: Directory,
    options?: MakeDirectoryOptions
  ) => Promise<boolean>;

  constructor(fs: FileSystem, path: string) {
    super(fs, path);
    const bi = fs.options?.beforeInterceptor;
    if (bi) {
      this.beforeMkcol = bi.beforeMkcol;
      this.beforeList = bi.beforeList;
    }

    const ai = fs.options?.afterInterceptor;
    if (ai) {
      this.afterMkcol = ai.afterMkcol;
      this.afterList = ai.afterList;
    }
  }

  public async list(): Promise<string[]> {
    let list: string[] | null | undefined;
    if (this.beforeList) {
      list = await this.beforeList(this);
    }
    if (!list) {
      list = await this._list();
    }
    if (this.afterList) {
      await this.afterList(this, list);
    }
    return list;
  }

  public async ls(): Promise<string[]> {
    return this.list();
  }

  /**
   * Create a directory.
   * @param options Either the file mode, or an object optionally specifying the file mode and whether parent folders
   */
  public async mkdir(options?: MakeDirectoryOptions): Promise<void> {
    if (this.beforeMkcol) {
      if (await this.beforeMkcol(this, options)) {
        return;
      }
    }
    await this._mkcol(options);
    if (this.afterMkcol) {
      await this.afterMkcol(this);
    }
  }

  /**
   * Read a directory.
   */
  public async readdir(): Promise<string[]> {
    return this.list();
  }

  public abstract _list(): Promise<string[]>;
  public abstract _mkcol(options?: MakeDirectoryOptions): Promise<void>;
}

export abstract class File extends FileSystemObject {
  private afterGet?: (file: File, rs: ReadStream) => Promise<void>;
  private afterPost?: (file: File, ws: WriteStream) => Promise<void>;
  private afterPut?: (file: File, ws: WriteStream) => Promise<void>;
  private beforeGet?: (
    file: File,
    options?: OpenOptions | undefined
  ) => Promise<ReadStream | null>;
  private beforePost?: (
    file: File,
    options?: OpenOptions | undefined
  ) => Promise<WriteStream | null>;
  private beforePut?: (
    file: File,
    options?: OpenOptions | undefined
  ) => Promise<WriteStream | null>;

  constructor(fs: FileSystem, path: string) {
    super(fs, path);
    const bi = fs.options?.beforeInterceptor;
    if (bi) {
      this.beforeGet = bi.beforeGet;
      this.beforePost = bi.beforePost;
      this.beforePut = bi.beforePut;
    }

    const ai = fs.options?.afterInterceptor;
    if (ai) {
      this.afterGet = ai.afterGet;
      this.afterPost = ai.afterPost;
      this.afterPut = ai.afterPut;
    }
  }

  public async hash(): Promise<string> {
    const rs = await this.openReadStream();
    try {
      const hash = createHash();
      let buffer: ArrayBuffer | Uint8Array;
      while ((buffer = await rs.read()) != null) {
        hash.update(toUint8Array(buffer));
      }

      return toHex(hash.digest());
    } finally {
      rs.close();
    }
  }

  public async openReadStream(options?: OpenOptions): Promise<ReadStream> {
    let rs: ReadStream | null | undefined;
    if (this.beforeGet) {
      rs = await this.beforeGet(this, options);
    }
    if (!rs) {
      rs = await this._openReadStream(options);
    }
    if (this.afterGet) {
      await this.afterGet(this, rs);
    }
    return rs;
  }

  public async openWriteStream(options?: OpenOptions): Promise<WriteStream> {
    let ws: WriteStream | null | undefined;
    let post: boolean;
    try {
      await this.head();
      if (this.beforePut) {
        ws = await this.beforePut(this, options);
      }
      post = false;
    } catch (e) {
      if (e instanceof NotFoundError) {
        if (this.beforePost) {
          ws = await this.beforePost(this, options);
        }
        post = true;
      } else {
        throw e;
      }
    }
    if (!ws) {
      ws = await this._openWriteStream(options);
    }
    if (post && this.afterPost) {
      await this.afterPost(this, ws);
    } else if (!post && this.afterPut) {
      await this.afterPut(this, ws);
    }
    return ws;
  }

  public abstract _openReadStream(options?: OpenOptions): Promise<ReadStream>;
  public abstract _openWriteStream(options?: OpenOptions): Promise<WriteStream>;
}

export enum SeekOrigin {
  Begin,
  Current,
  End,
}

export interface OpenOptions {
  bufferSize?: number;
}
export abstract class Stream {
  protected readonly bufferSize = 64 * 1024;

  constructor(protected path: string, options?: OpenOptions) {
    if (options?.bufferSize) {
      this.bufferSize = options.bufferSize;
    }
  }

  public abstract close(): Promise<void>;
  public abstract seek(offset: number, origin: SeekOrigin): Promise<void>;
}

export abstract class ReadStream extends Stream {
  /**
   * Asynchronously reads data from the file.
   * The `File` must have been opened for reading.
   */
  public abstract read(size?: number): Promise<ArrayBuffer | Uint8Array>;
}

export abstract class WriteStream extends Stream {
  public abstract setLength(len: number): Promise<void>;
  /**
   * Asynchronously reads data from the file.
   * The `File` must have been opened for reading.
   */
  public abstract write(data: ArrayBuffer | Uint8Array): Promise<void>;
}
