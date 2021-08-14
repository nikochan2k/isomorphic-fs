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
  hook?: Hook;
}

export type URLType = "GET" | "POST" | "PUT" | "DELETE";

export interface Options {
  ignoreHook?: boolean;
}

export interface DeleteOptions extends Options {
  /**
   * When `true`, exceptions will be ignored if `path` does not exist.
   * @default false
   */
  force: boolean;
  /**
   * If `true`, perform a recursive directory removal. In
   * recursive mode, errors are not reported if `path` does not exist, and
   * operations are retried on failure.
   * @default false
   */
  recursive: boolean;
}

export interface HeadOptions extends Options {}

export interface PatchOptions extends Options {}

export interface ListOptions extends Options {}

export interface MkcolOptions extends Options {
  /**
   * If it is true, exceptions will be ignored if the directory exist.
   * @default false
   */
  force: boolean;
  /**
   * Indicates whether parent folders should be created.
   * If a folder was created, the path to the first created folder will be returned.
   * @default false
   */
  recursive: boolean;
}

export interface OpenOptions extends Options {
  awaitingSize?: number;
  bufferSize?: number;
}

export interface OpenWriteOptions extends OpenOptions {
  /**
   * Open file for appending.
   * @default false
   */
  append: boolean;
  /**
   * If it is true, the file is created if it does not exist, fail if it exists.
   * If it is false, fail if it exists, truncated if it does not exist.
   * If it is undefined, the file is created if it does not exist, or truncated if it exists.
   */
  create: boolean;
}

export interface MoveOptions extends Options {
  bufferSize?: number;
  force: boolean;
}

export interface CopyOptions extends Options {
  bufferSize?: number;
  force: boolean;
  recursive: boolean;
}
export interface XmitOptions extends Options {
  bufferSize?: number;
  force: boolean;
  move: boolean;
  recursive: boolean;
}

export interface Hook {
  afterDelete?: (path: string) => Promise<void>;
  afterGet?: (path: string) => Promise<void>;
  afterHead?: (path: string, stats: Stats) => Promise<void>;
  afterList?: (path: string, list: string[]) => Promise<void>;
  afterMkcol?: (path: string) => Promise<void>;
  afterPatch?: (path: string) => Promise<void>;
  afterPost?: (path: string) => Promise<void>;
  afterPut?: (path: string) => Promise<void>;
  beforeDelete?: (path: string, options: DeleteOptions) => Promise<boolean>;
  beforeGet?: (
    path: string,
    options: OpenOptions
  ) => Promise<ReadStream | null>;
  beforeHead?: (path: string, options: HeadOptions) => Promise<Stats | null>;
  beforeList?: (path: string, options: ListOptions) => Promise<string[] | null>;
  beforeMkcol?: (path: string, options: MkcolOptions) => Promise<boolean>;
  beforePatch?: (
    path: string,
    props: Props,
    options: PatchOptions
  ) => Promise<boolean>;
  beforePost?: (
    path: string,
    options: OpenWriteOptions
  ) => Promise<WriteStream | null>;
  beforePut?: (
    path: string,
    options: OpenWriteOptions
  ) => Promise<WriteStream | null>;
}

export interface XmitError {
  error: Error;
  from: FileSystemObject;
  to: FileSystemObject;
}

export interface FileSystem {
  options: FileSystemOptions;
  repository: string;

  copy(
    fromPath: string,
    toPath: string,
    options?: CopyOptions
  ): Promise<XmitError[]>;
  cp(
    fromPath: string,
    toPath: string,
    options?: CopyOptions
  ): Promise<XmitError[]>;
  createReadStream(path: string, options?: OpenOptions): Promise<ReadStream>;
  createWriteStream(
    path: string,
    options?: OpenWriteOptions
  ): Promise<WriteStream>;
  del(path: string, options?: DeleteOptions): Promise<void>;
  delete(path: string, options?: DeleteOptions): Promise<void>;
  getDirectory(path: string): Promise<Directory>;
  getFile(path: string): Promise<File>;
  hash(path: string, options?: OpenOptions): Promise<string>;
  head(path: string, options?: HeadOptions): Promise<Stats>;
  list(path: string, options?: ListOptions): Promise<string[]>;
  ls(path: string, options?: ListOptions): Promise<string[]>;
  mkcol(path: string, options?: MkcolOptions): Promise<void>;
  mkdir(path: string, options?: MkcolOptions): Promise<void>;
  move(
    fromPath: string,
    toPath: string,
    options?: MoveOptions
  ): Promise<XmitError[]>;
  mv(
    fromPath: string,
    toPath: string,
    options?: MoveOptions
  ): Promise<XmitError[]>;
  patch(path: string, props: Props, options?: PatchOptions): Promise<void>;
  readAll(path: string, options?: OpenOptions): Promise<ArrayBuffer>;
  readdir(path: string, options?: ListOptions): Promise<string[]>;
  rm(path: string, options?: DeleteOptions): Promise<void>;
  stat(path: string, options?: HeadOptions): Promise<Stats>;
  toURL(path: string, urlType?: URLType): Promise<string>;
  writeAll(
    path: string,
    buffer: ArrayBuffer | Uint8Array,
    options?: OpenWriteOptions
  ): Promise<void>;
}

export interface FileSystemObject {
  fs: FileSystem;
  path: string;

  copy(fso: FileSystemObject, options?: CopyOptions): Promise<XmitError[]>;
  cp(fso: FileSystemObject, options?: CopyOptions): Promise<XmitError[]>;
  del(options?: DeleteOptions): Promise<void>;
  delete(options?: DeleteOptions): Promise<void>;
  getParent(): Promise<Directory>;
  head(options?: HeadOptions): Promise<Stats>;
  move(fso: FileSystemObject, options?: MoveOptions): Promise<XmitError[]>;
  mv(fso: FileSystemObject, options?: MoveOptions): Promise<XmitError[]>;
  patch(props: Props, options?: PatchOptions): Promise<void>;
  rm(options?: DeleteOptions): Promise<void>;
  stat(options?: HeadOptions): Promise<Stats>;
  toURL(urlType?: URLType): Promise<string>;
}

export interface Directory extends FileSystemObject {
  list(options?: ListOptions): Promise<string[]>;
  ls(options?: ListOptions): Promise<string[]>;
  mkcol(options?: MkcolOptions): Promise<void>;
  mkdir(options?: MkcolOptions): Promise<void>;
  readdir(options?: ListOptions): Promise<string[]>;
}

export interface File extends FileSystemObject {
  createReadStream(options?: OpenOptions): Promise<ReadStream>;
  createWriteStream(options?: OpenWriteOptions): Promise<WriteStream>;
  hash(options?: OpenOptions): Promise<string>;
  readAll(options?: OpenOptions): Promise<ArrayBuffer>;
  writeAll(
    buffer: ArrayBuffer | Uint8Array,
    options?: OpenWriteOptions
  ): Promise<void>;
}

export enum SeekOrigin {
  Begin,
  Current,
  End,
}
export interface Stream {
  position: number;
  close(): Promise<void>;
  seek(offset: number, origin: SeekOrigin): Promise<void>;
}

export interface ReadStream extends Stream {
  pipe(ws: WriteStream): Promise<void>;
  read(size?: number): Promise<ArrayBuffer | null>;
}
export interface WriteStream extends Stream {
  truncate(size: number): Promise<void>;
  write(buffer: ArrayBuffer | Uint8Array): Promise<void>;
}

export const DEFAULT_BUFFER_SIZE = 96 * 1024;
