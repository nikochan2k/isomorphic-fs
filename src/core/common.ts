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
  force?: boolean;
  /**
   * If `true`, perform a recursive directory removal. In
   * recursive mode, errors are not reported if `path` does not exist, and
   * operations are retried on failure.
   * @default false
   */
  recursive?: boolean;
}

export interface HeadOptions extends Options {}

export interface PatchOptions extends Options {}

export interface ListOptions extends Options {}

export interface MkcolOptions extends Options {
  /**
   * Indicates whether parent folders should be created.
   * If a folder was created, the path to the first created folder will be returned.
   * @default false
   */
  recursive?: boolean;
}

export interface OpenOptions extends Options {
  bufferSize?: number;
}

export interface OpenWriteOptions extends OpenOptions {
  append?: boolean;
  create?: boolean;
}

export interface XmitOptions extends Options {
  bufferSize?: number;
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
  repository: string;
  options: FileSystemOptions;
  copy(
    fromPath: string,
    toPath: string,
    options?: XmitOptions
  ): Promise<XmitError[]>;
  del(path: string, options?: DeleteOptions): Promise<void>;
  delete(path: string, options?: DeleteOptions): Promise<void>;
  getDirectory(path: string): Promise<Directory>;
  getFile(path: string): Promise<File>;
  head(path: string, options?: HeadOptions): Promise<Stats>;
  move(
    fromPath: string,
    toPath: string,
    options?: XmitOptions
  ): Promise<XmitError[]>;
  patch(path: string, props: Props, options?: PatchOptions): Promise<void>;
  rm(path: string, options?: DeleteOptions): Promise<void>;
  stat(path: string, options?: HeadOptions): Promise<Stats>;
  toURL(path: string, urlType?: URLType): Promise<string>;
}

export interface FileSystemObject {
  fs: FileSystem;
  path: string;
  copy(fso: FileSystemObject, options: XmitOptions): Promise<XmitError[]>;
  del(options?: DeleteOptions): Promise<void>;
  delete(options?: DeleteOptions): Promise<void>;
  getParent(): Promise<string>;
  head(options?: DeleteOptions): Promise<Stats>;
  move(fso: FileSystemObject, options: XmitOptions): Promise<XmitError[]>;
  patch(props: Props, options: PatchOptions): Promise<void>;
  rm(options?: DeleteOptions): Promise<void>;
  stat(options?: DeleteOptions): Promise<Stats>;
  toURL(urlType?: URLType): Promise<string>;
}

export interface Directory extends FileSystemObject {
  list(options?: ListOptions): Promise<string[]>;
  ls(options?: ListOptions): Promise<string[]>;
  readdir(options?: ListOptions): Promise<string[]>;
  mkdir(options?: MkcolOptions): Promise<void>;
  mkcol(options?: MkcolOptions): Promise<void>;
}

export interface File extends FileSystemObject {
  hash(bufferSize?: number): Promise<string>;
  openReadStream(options?: OpenOptions): Promise<ReadStream>;
  openWriteStream(options?: OpenWriteOptions): Promise<WriteStream>;
}

export enum SeekOrigin {
  Begin,
  Current,
  End,
}
export interface Stream {
  seek(offset: number, origin: SeekOrigin): Promise<void>;
  close(): Promise<void>;
}

export interface ReadStream extends Stream {
  read(size?: number): Promise<ArrayBuffer | Uint8Array>;
}
export interface WriteStream extends Stream {
  setLength(len: number): Promise<void>;
  write(buffer: ArrayBuffer | Uint8Array): Promise<void>;
}
