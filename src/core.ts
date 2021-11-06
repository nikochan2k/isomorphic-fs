import { Data, DataType, ReturnDataType } from "univ-conv";

type Primitive = boolean | number | string | null | undefined;

export interface Props {
  [key: string]: Primitive;
}

export interface Times {
  accessed?: number;
  created?: number;
  modified?: number;
}

export interface Stats extends Times, Props {
  size?: number;
  etag?: string;
}

export const EXCLUDE_PROP_NAMES = [
  "accessed",
  "created",
  "modified",
  "size",
  "hash",
];

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

export type HeadOptions = Options;

export type PatchOptions = Options;

export type ListOptions = Options;

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

export interface ReadOptions<T extends DataType> extends OpenOptions {
  type?: T;
}

export interface WriteOptions extends OpenOptions {
  append?: boolean;
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
export interface XmitOptions extends Options {
  bufferSize?: number;
  force: boolean;
  recursive: boolean;
}

export interface URLOptions {
  urlType?: URLType;
  expires?: number;
}

export interface Hook {
  afterDelete?: (path: string) => Promise<void>;
  afterGet?: (path: string, data: Data) => Promise<void>;
  afterHead?: (path: string, stats: Stats) => Promise<void>;
  afterList?: (path: string, list: string[]) => Promise<void>;
  afterMkcol?: (path: string) => Promise<void>;
  afterPatch?: (path: string) => Promise<void>;
  afterPost?: (path: string, data: Data) => Promise<void>;
  afterPut?: (path: string, data: Data) => Promise<void>;
  beforeDelete?: (path: string, options: DeleteOptions) => Promise<boolean>;
  beforeGet?: (path: string, options: OpenOptions) => Promise<Data | null>;
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
    data: Data,
    options: WriteOptions
  ) => Promise<boolean>;
  beforePut?: (
    path: string,
    data: Data,
    options: WriteOptions
  ) => Promise<boolean>;
}

export interface ErrorLike {
  code?: number;
  message?: string;
  name?: string;
  stack?: string;
  [key: string]: any; // eslint-disable-line
}

export interface FileSystem {
  options: FileSystemOptions;
  repository: string;

  copy(
    fromPath: string,
    toPath: string,
    options?: CopyOptions
  ): Promise<ErrorLike[]>;
  cp(
    fromPath: string,
    toPath: string,
    options?: CopyOptions
  ): Promise<ErrorLike[]>;
  del(path: string, options?: DeleteOptions): Promise<ErrorLike[]>;
  delete(path: string, options?: DeleteOptions): Promise<ErrorLike[]>;
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
  ): Promise<ErrorLike[]>;
  mv(
    fromPath: string,
    toPath: string,
    options?: MoveOptions
  ): Promise<ErrorLike[]>;
  patch(path: string, props: Props, options?: PatchOptions): Promise<void>;
  read<T extends DataType>(
    path: string,
    options?: ReadOptions<T>
  ): Promise<ReturnDataType<T>>;
  readdir(path: string, options?: ListOptions): Promise<string[]>;
  rm(path: string, options?: DeleteOptions): Promise<ErrorLike[]>;
  stat(path: string, options?: HeadOptions): Promise<Stats>;
  toURL(path: string, options?: URLOptions): Promise<string>;
  write(path: string, data: Data, options?: WriteOptions): Promise<void>;
}

export interface Entry {
  fs: FileSystem;
  path: string;

  copy(entry: Entry, options?: CopyOptions): Promise<ErrorLike[]>;
  cp(entry: Entry, options?: CopyOptions): Promise<ErrorLike[]>;
  del(options?: DeleteOptions): Promise<ErrorLike[]>;
  delete(options?: DeleteOptions): Promise<ErrorLike[]>;
  getParent(): Promise<Directory>;
  head(options?: HeadOptions): Promise<Stats>;
  move(entry: Entry, options?: MoveOptions): Promise<ErrorLike[]>;
  mv(entry: Entry, options?: MoveOptions): Promise<ErrorLike[]>;
  patch(props: Props, options?: PatchOptions): Promise<void>;
  rm(options?: DeleteOptions): Promise<ErrorLike[]>;
  stat(options?: HeadOptions): Promise<Stats>;
  toURL(options?: URLOptions): Promise<string>;
}

export interface Directory extends Entry {
  list(options?: ListOptions): Promise<string[]>;
  ls(options?: ListOptions): Promise<string[]>;
  mkcol(options?: MkcolOptions): Promise<void>;
  mkdir(options?: MkcolOptions): Promise<void>;
  readdir(options?: ListOptions): Promise<string[]>;
}

export interface File extends Entry {
  hash(options?: OpenOptions): Promise<string>;
  read<T extends DataType>(
    options?: ReadOptions<T>
  ): Promise<ReturnDataType<T>>;
  write(data: Data, options?: WriteOptions): Promise<void>;
}

export const DEFAULT_BUFFER_SIZE = 96 * 1024;
