import { createHash } from "sha256-uint8array";
import { toUint8Array } from "./util/buffer";
import { toHex } from "./util/misc";
import { getParentPath } from "./util/path";

export interface BeforeInterceptor {
  beforeCopy?: (fso: FileSystemObject) => Promise<boolean>;
  beforeDelete?: (fso: FileSystemObject) => Promise<boolean>;
  beforeGet?: (file: File, options?: OpenOptions) => Promise<ReadStream | null>;
  beforeHead?: (fso: FileSystemObject) => Promise<Stats | null>;
  beforeList?: (dir: Directory) => Promise<string[] | null>;
  beforeMkcol?: (dir: Directory) => Promise<boolean>;
  beforeMove?: (fso: FileSystemObject) => Promise<boolean>;
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
  afterCopy?: (fso: FileSystemObject) => Promise<void>;
  afterDelete?: (fso: FileSystemObject) => Promise<void>;
  afterGet?: (file: File, rs: ReadStream) => Promise<void>;
  afterHead?: (fso: FileSystemObject, stats: Stats) => Promise<void>;
  afterList?: (dir: Directory, list: string[]) => Promise<void>;
  afterMkcol?: (dir: Directory) => Promise<void>;
  afterMove?: (fso: FileSystemObject) => Promise<void>;
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
    public readonly options: FileSystemOptions
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

export abstract class FileSystemObject {
  private afterDelete?: (fso: FileSystemObject) => Promise<void>;
  private afterHead?: (fso: FileSystemObject, stats: Stats) => Promise<void>;
  private afterPatch?: (fso: FileSystemObject) => Promise<void>;
  private beforeDelete?: (fso: FileSystemObject) => Promise<boolean>;
  private beforeHead?: (fso: FileSystemObject) => Promise<Stats | null>;
  private beforePatch?: (
    fso: FileSystemObject,
    props: Props
  ) => Promise<boolean>;

  constructor(public readonly fs: FileSystem, public readonly path: string) {
    const bi = fs.options?.beforeInterceptor;
    if (bi) {
      this.beforeHead = bi.beforeHead;
      this.beforeDelete = bi.beforeDelete;
      this.beforePatch = bi.beforePatch;
    }

    const ai = fs.options?.afterInterceptor;
    if (ai) {
      this.afterHead = ai.afterHead;
      this.afterDelete = ai.afterDelete;
      this.afterPatch = ai.afterPatch;
    }
  }

  public async getParent(): Promise<string> {
    return getParentPath(this.path);
  }

  public async getStats(): Promise<Stats> {
    let stats: Stats | null | undefined;
    if (this.beforeHead) {
      stats = await this.beforeHead(this);
    }
    if (!stats) {
      stats = await this.doGetStats();
    }
    if (this.afterHead) {
      await this.afterHead(this, stats);
    }
    return stats;
  }

  /**
   * Asynchronously removes files and directories (modeled on the standard POSIX `rm` utility).
   */
  public async rm(options?: RmOptions): Promise<void> {
    if (this.beforeDelete) {
      if (await this.beforeDelete(this)) {
        return;
      }
    }
    await this.doRm(options);
    if (this.afterDelete) {
      await this.afterDelete(this);
    }
  }

  public async setProps(props: Props): Promise<void> {
    if (this.beforePatch) {
      if (await this.beforePatch(this, props)) {
        return;
      }
    }
    await this.doSetProps(props);
    if (this.afterPatch) {
      await this.afterPatch(this);
    }
  }

  public abstract doGetStats(): Promise<Stats>;
  public abstract doRm(options?: RmOptions): Promise<void>;
  public abstract doSetProps(props: Props): Promise<void>;
  public abstract getURL(urlType?: URLType): Promise<string>;
}

export interface MakeDirectoryOptions {
  /**
   * Indicates whether parent folders should be created.
   * If a folder was created, the path to the first created folder will be returned.
   * @default false
   */
  recursive?: boolean;
}

export interface RmOptions {
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

export abstract class Directory extends FileSystemObject {
  /**
   * Create a directory.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * @param options Either the file mode, or an object optionally specifying the file mode and whether parent folders
   */
  public abstract mkdir(options?: MakeDirectoryOptions): Promise<void>;
  /**
   * Read a directory.
   */
  public abstract readdir(): Promise<string[]>;
}

export abstract class File extends FileSystemObject {
  constructor(fs: FileSystem, path: string) {
    super(fs, path);
  }

  public async getHash(): Promise<string> {
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

  public openReadStream(options?: OpenOptions): Promise<ReadStream> {
    return this.doOpenReadStream(options);
  }

  public openWriteStream(options?: OpenOptions): Promise<WriteStream> {
    return this.doOpenWriteStream(options);
  }

  public abstract doOpenReadStream(options?: OpenOptions): Promise<ReadStream>;
  public abstract doOpenWriteStream(
    options?: OpenOptions
  ): Promise<WriteStream>;
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
