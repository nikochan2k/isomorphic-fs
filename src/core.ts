import { ConvertOptions, Data, DataType, ReturnData } from "univ-conv";

type Primitive = boolean | number | string | null | undefined;

export interface Times {
  accessed?: number;
  created?: number;
  modified?: number;
}

export interface Props extends Times {
  [key: string]: Primitive;
}

export interface Stats extends Props {
  etag?: string;
  size?: number;
}

export const EXCLUDE_PROP_NAMES = [
  "accessed",
  "created",
  "modified",
  "size",
  "etag",
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

export enum EntryType {
  File = "f",
  Directory = "d",
}

export interface Item extends Stats {
  path: string;
  type?: EntryType;
}

export interface HeadOptions extends Options {
  type?: EntryType;
}

export interface PatchOptions extends Options {
  type?: EntryType;
}

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
export interface ReadOptions extends Options, Partial<ConvertOptions> {}

export interface WriteOptions extends Options, Partial<ConvertOptions> {
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
  expires?: number;
  urlType?: URLType;
}

export interface Hook {
  afterDelete?: (path: string) => Promise<void>;
  afterGet?: (path: string, data: Data) => Promise<void>;
  afterHead?: (path: string, stats: Stats) => Promise<void>;
  afterList?: (path: string, list: Item[]) => Promise<void>;
  afterMkcol?: (path: string) => Promise<void>;
  afterPatch?: (path: string) => Promise<void>;
  afterPost?: (path: string) => Promise<void>;
  afterPut?: (path: string) => Promise<void>;
  beforeDelete?: (path: string, options: DeleteOptions) => Promise<boolean>;
  beforeGet?: (path: string, options: ReadOptions) => Promise<Data | null>;
  beforeHead?: (path: string, options: HeadOptions) => Promise<Stats | null>;
  beforeList?: (path: string, options: ListOptions) => Promise<Item[] | null>;
  beforeMkcol?: (path: string, options: MkcolOptions) => Promise<boolean>;
  beforePatch?: (
    path: string,
    props: Props,
    options: PatchOptions
  ) => Promise<boolean>;
  beforePost?: (
    path: string,
    data: Data,
    stats: Stats | undefined,
    options: WriteOptions
  ) => Promise<boolean>;
  beforePut?: (
    path: string,
    data: Data,
    stats: Stats | undefined,
    options: WriteOptions
  ) => Promise<boolean>;
}

export interface ErrorLike {
  code?: number;
  message?: string;
  name?: string;
  stack?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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
  dir(path: string, options?: ListOptions): Promise<string[]>;
  getDirectory(path: string): Promise<Directory>;
  getFile(path: string): Promise<File>;
  hash(path: string, options?: ReadOptions): Promise<string>;
  head(path: string, options?: HeadOptions): Promise<Stats>;
  list(path: string, options?: ListOptions): Promise<string[]>;
  ls(path: string, options?: ListOptions): Promise<string[]>;
  mkcol(path: string, options?: MkcolOptions): Promise<boolean>;
  mkdir(path: string, options?: MkcolOptions): Promise<boolean>;
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
    type: T,
    options?: ReadOptions
  ): Promise<ReturnData<T>>;
  readdir(path: string, options?: ListOptions): Promise<string[]>;
  rm(path: string, options?: DeleteOptions): Promise<ErrorLike[]>;
  stat(path: string, options?: HeadOptions): Promise<Stats>;
  supportDirectory(): boolean;
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
  remove(options?: DeleteOptions): Promise<ErrorLike[]>;
  rm(options?: DeleteOptions): Promise<ErrorLike[]>;
  stat(options?: HeadOptions): Promise<Stats>;
  toURL(options?: URLOptions): Promise<string>;
}

export interface Directory extends Entry {
  dir(options?: ListOptions): Promise<string[]>;
  list(options?: ListOptions): Promise<string[]>;
  ls(options?: ListOptions): Promise<string[]>;
  mkcol(options?: MkcolOptions): Promise<boolean>;
  mkdir(options?: MkcolOptions): Promise<boolean>;
  readdir(options?: ListOptions): Promise<string[]>;
}

export interface File extends Entry {
  hash(options?: ReadOptions): Promise<string>;
  read<T extends DataType>(
    type: T,
    options?: ReadOptions
  ): Promise<ReturnData<T>>;
  write(data: Data, options?: WriteOptions): Promise<void>;
}

export const DEFAULT_BUFFER_SIZE = 96 * 1024;
