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

export interface OpenOptions {
  highWaterMark?: number;
  start?: number;
}

export type OpenWriteFlags = "a" | "ax" | "w" | "wx";

export interface OpenWriteOptions extends OpenOptions {
  flag?: OpenWriteFlags;
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
  public abstract openRead(
    path: string,
    options: OpenOptions
  ): Promise<FileRead>;
  /**
   * Open a file for writing.
   * @param path A path to a file..
   * @param options
   */
  public abstract openWrite(
    path: string,
    options: OpenWriteOptions
  ): Promise<FileWrite>;
}

export type URLType = "GET" | "POST" | "PUT" | "DELETE";

export abstract class FileSystemObject {
  constructor(public fs: FileSystem, public path: string) {}

  public async getParent(): Promise<string> {
    return getParentPath(this.path);
  }

  public abstract getStats(): Promise<Stats>;
  public abstract getURL(urlType?: URLType): Promise<string>;
  public abstract isDirectory(): boolean;
  public abstract isFile(): boolean;
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
  public isDirectory(): boolean {
    return true;
  }

  public isFile(): boolean {
    return false;
  }

  /**
   * Create a directory.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * @param options Either the file mode, or an object optionally specifying the file mode and whether parent folders
   */
  public abstract mkdir(
    options: MakeDirectoryOptions & { recursive: true }
  ): Promise<void>;
  /**
   * Read a directory.
   */
  public abstract readdir(): Promise<string[]>;
}

export abstract class File extends FileSystemObject {
  protected highWaterMark = 64 * 1024;
  protected start = 0;

  constructor(fs: FileSystem, path: string, options?: OpenOptions) {
    super(fs, path);
    if (options?.highWaterMark) {
      this.highWaterMark = options.highWaterMark;
    }
    if (options?.start) {
      this.start = options.start;
    }
  }

  public isDirectory(): boolean {
    return false;
  }

  public isFile(): boolean {
    return true;
  }
}

export abstract class FileRead extends File {
  constructor(fs: FileSystem, path: string, options?: OpenOptions) {
    super(fs, path, options);
  }

  /**
   * Close a `File`.
   */
  public abstract close(): Promise<void>;
  /**
   * Asynchronously reads data from the file.
   * The `File` must have been opened for reading.
   */
  public abstract read(): Promise<BufferSource>;
}

export abstract class FileWrite extends File {
  protected flags: OpenWriteFlags;

  constructor(fs: FileSystem, path: string, options?: OpenWriteOptions) {
    super(fs, path, options);
    this.flags = options?.flag || "w";
  }

  /**
   * Truncate a file to a specified length.
   * @param len If not specified, defaults to `0`.
   */
  public abstract truncate(len?: number): Promise<void>;
  /**
   * Asynchronously writes `buffer` to the file.
   * The `FileHandle` must have been opened for writing.
   * @param data The buffer that the data will be written to.
   */
  public abstract write(data: BufferSource): Promise<number>;
}
