import { getParentPath } from "./util/path";

export interface Times {
  accessed?: number;
  created?: number;
  deleted?: number;
  modified?: number;
}

export interface Stats extends Times {
  size?: number;
}
export abstract class FileSystem {
  constructor(public repository: string) {}

  /**
   * Open a directory.
   * @param path A path to a directory.
   * @param options
   */
  public abstract openDirectory(path: string): Promise<Directory>;
  /**
   * Open a file for reading.
   * @param path A path to a file.
   * @param options
   */
  public abstract openFile(path: string, options?: OpenOptions): Promise<File>;
}

export type URLType = "GET" | "POST" | "PUT" | "DELETE";

export abstract class FileSystemObject {
  constructor(public fs: FileSystem, public path: string) {}

  public async getParent(): Promise<string> {
    return getParentPath(this.path);
  }

  public abstract getStats(): Promise<Stats>;
  public abstract getURL(urlType?: URLType): Promise<string>;
  /**
   * Asynchronously removes files and directories (modeled on the standard POSIX `rm` utility).
   */
  public abstract rm(options?: RmOptions): Promise<void>;
  public abstract setTimes(times: Times): Promise<void>;
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

  public abstract getHash(): Promise<string>;
  public abstract openReadStream(options?: OpenOptions): ReadStream;
  public abstract openWriteStream(options?: OpenOptions): WriteStream;
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
  protected bufferSize = 64 * 1024;

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
  public abstract read(): Promise<ArrayBuffer | Uint8Array>;
}

export abstract class WriteStream extends Stream {
  public abstract setLength(len: number): Promise<void>;
  /**
   * Asynchronously reads data from the file.
   * The `File` must have been opened for reading.
   */
  public abstract write(data: ArrayBuffer | Uint8Array): Promise<number>;
}
