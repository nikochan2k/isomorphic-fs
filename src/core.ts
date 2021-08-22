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

export type BinarySource = ArrayBuffer | Uint8Array | Buffer | Blob;
export type EncodingType = "Base64" | "Text" | "BinaryString";
export interface StringSource {
  encoding: EncodingType;
  value: string;
}
export type Source = BinarySource | StringSource;
export type SourceType =
  | "ArrayBuffer"
  | "Uint8Array"
  | "Buffer"
  | "Blob"
  | "Base64"
  | "BinaryString"
  | "Text";

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
  bufferSize?: number;
}

export interface OpenReadOptions extends OpenOptions {
  sourceType?: SourceType;
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
  create?: boolean;
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

export interface UnlinkOptions extends DeleteOptions {
  deleted: number;
  errors: ErrorLike[];
}
export interface XmitOptions extends Options {
  bufferSize?: number;
  force: boolean;
  move: boolean;
  recursive: boolean;
  copied: number;
  moved: number;
  errors: ErrorLike[];
}

export type Ret<T> = [T, never] | [never, ErrorLike];
export type Ret2<T> = [T, ErrorLike[]];

export interface Hook {
  afterDelete?: (path: string) => Promise<void>;
  afterGet?: (path: string) => Promise<void>;
  afterHead?: (path: string, stats: Stats) => Promise<void>;
  afterList?: (path: string, list: string[]) => Promise<void>;
  afterMkcol?: (path: string) => Promise<void>;
  afterPatch?: (path: string) => Promise<void>;
  afterPost?: (path: string) => Promise<void>;
  afterPut?: (path: string) => Promise<void>;
  beforeDelete?: (
    path: string,
    options: DeleteOptions
  ) => Promise<Ret2<number>>;
  beforeGet?: (path: string, options: OpenOptions) => Promise<Ret<ReadStream>>;
  beforeHead?: (path: string, options: HeadOptions) => Promise<Ret<Stats>>;
  beforeList?: (path: string, options: ListOptions) => Promise<Ret<string[]>>;
  beforeMkcol?: (path: string, options: MkcolOptions) => Promise<Ret<boolean>>;
  beforePatch?: (
    path: string,
    props: Props,
    options: PatchOptions
  ) => Promise<Ret<boolean>>;
  beforePost?: (
    path: string,
    options: OpenWriteOptions
  ) => Promise<Ret<WriteStream>>;
  beforePut?: (
    path: string,
    options: OpenWriteOptions
  ) => Promise<Ret<WriteStream>>;
}

export interface ErrorLike {
  code?: number;
  name?: string;
  message?: string;
  stack?: string;
  [key: string]: any;
}

export interface FileSystem {
  options: FileSystemOptions;
  repository: string;

  copy(
    fromPath: string,
    toPath: string,
    options?: CopyOptions
  ): Promise<Ret2<number>>;
  cp(
    fromPath: string,
    toPath: string,
    options?: CopyOptions
  ): Promise<Ret2<number>>;
  createReadStream(
    path: string,
    options?: OpenReadOptions
  ): Promise<Ret<ReadStream>>;
  createWriteStream(
    path: string,
    options?: OpenWriteOptions
  ): Promise<Ret<WriteStream>>;
  del(path: string, options?: DeleteOptions): Promise<Ret2<number>>;
  delete(path: string, options?: DeleteOptions): Promise<Ret2<number>>;
  getDirectory(path: string): Promise<Ret<Directory>>;
  getFile(path: string): Promise<Ret<File>>;
  hash(path: string, options?: OpenOptions): Promise<Ret<string>>;
  head(path: string, options?: HeadOptions): Promise<Ret<Stats>>;
  list(path: string, options?: ListOptions): Promise<Ret<string[]>>;
  ls(path: string, options?: ListOptions): Promise<Ret<string[]>>;
  mkcol(path: string, options?: MkcolOptions): Promise<Ret<boolean>>;
  mkdir(path: string, options?: MkcolOptions): Promise<Ret<boolean>>;
  move(
    fromPath: string,
    toPath: string,
    options?: MoveOptions
  ): Promise<Ret2<number>>;
  mv(
    fromPath: string,
    toPath: string,
    options?: MoveOptions
  ): Promise<Ret2<number>>;
  patch(
    path: string,
    props: Props,
    options?: PatchOptions
  ): Promise<Ret<boolean>>;
  readAll(path: string, options?: OpenReadOptions): Promise<Ret<Source>>;
  readdir(path: string, options?: ListOptions): Promise<Ret<string[]>>;
  rm(path: string, options?: DeleteOptions): Promise<Ret2<number>>;
  stat(path: string, options?: HeadOptions): Promise<Ret<Stats>>;
  toURL(path: string, urlType?: URLType): Promise<Ret<string>>;
  writeAll(
    path: string,
    src: Source,
    options?: OpenWriteOptions
  ): Promise<Ret<number>>;
  unlink(path: string, options?: DeleteOptions): Promise<Ret2<number>>;
}

export interface Entry {
  fs: FileSystem;
  path: string;

  copy(entry: Entry, options?: CopyOptions): Promise<Ret2<number>>;
  cp(entry: Entry, options?: CopyOptions): Promise<Ret2<number>>;
  del(options?: DeleteOptions): Promise<Ret2<number>>;
  delete(options?: DeleteOptions): Promise<Ret2<number>>;
  getParent(): Promise<Ret<Directory>>;
  head(options?: HeadOptions): Promise<Ret<Stats>>;
  move(entry: Entry, options?: MoveOptions): Promise<Ret2<number>>;
  mv(entry: Entry, options?: MoveOptions): Promise<Ret2<number>>;
  patch(props: Props, options?: PatchOptions): Promise<Ret<boolean>>;
  rm(options?: DeleteOptions): Promise<Ret2<number>>;
  stat(options?: HeadOptions): Promise<Ret<Stats>>;
  toURL(urlType?: URLType): Promise<Ret<string>>;
  unlink(options?: DeleteOptions): Promise<Ret2<number>>;
}

export interface Directory extends Entry {
  list(options?: ListOptions): Promise<Ret<string[]>>;
  ls(options?: ListOptions): Promise<Ret<string[]>>;
  mkcol(options?: MkcolOptions): Promise<Ret<boolean>>;
  mkdir(options?: MkcolOptions): Promise<Ret<boolean>>;
  readdir(options?: ListOptions): Promise<Ret<string[]>>;
}

export interface File extends Entry {
  createReadStream(options?: OpenReadOptions): Promise<Ret<ReadStream>>;
  createWriteStream(options?: OpenWriteOptions): Promise<Ret<WriteStream>>;
  hash(options?: OpenOptions): Promise<Ret<string>>;
  readAll(options?: OpenReadOptions): Promise<Ret<Source>>;
  writeAll(src: Source, options: OpenWriteOptions): Promise<Ret<number>>;
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
  pipe(ws: WriteStream): Promise<ErrorLike | void>;
  read(size?: number): Promise<Source | null>;
}
export interface WriteStream extends Stream {
  truncate(size: number): Promise<void>;
  write(src: Source): Promise<number>;
}

export const DEFAULT_BUFFER_SIZE = 96 * 1024;
