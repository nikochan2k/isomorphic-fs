import { ConvertOptions, Data, DataType, ReturnData } from "univ-conv";
import { FileSystemError } from "./errors";

type Primitive = boolean | number | string | null | undefined;

export interface Times {
  accessed?: number;
  created?: number;
  modified?: number;
}

export interface Stats extends Times {
  etag?: string;
  size?: number;

  [key: string]: Primitive;
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
  errors?: FileSystemError[];
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
    props: Stats,
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
  name: string;
  stack?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface FileSystem {
  options: FileSystemOptions;
  repository: string;

  copy(fromPath: string, toPath: string, options?: CopyOptions): Promise<void>;
  cp(fromPath: string, toPath: string, options?: CopyOptions): Promise<void>;
  del(path: string, options?: DeleteOptions): Promise<void>;
  delete(path: string, options?: DeleteOptions): Promise<void>;
  dir(path: string, options?: ListOptions): Promise<string[] | null>;
  getDirectory(path: string): Promise<Directory>;
  getFile(path: string): Promise<File>;
  hash(path: string, options?: ReadOptions): Promise<string | null>;
  head(path: string, options?: HeadOptions): Promise<Stats | null>;
  list(path: string, options?: ListOptions): Promise<string[] | null>;
  ls(path: string, options?: ListOptions): Promise<string[] | null>;
  mkcol(path: string, options?: MkcolOptions): Promise<boolean>;
  mkdir(path: string, options?: MkcolOptions): Promise<boolean>;
  move(fromPath: string, toPath: string, options?: MoveOptions): Promise<void>;
  mv(fromPath: string, toPath: string, options?: MoveOptions): Promise<void>;
  patch(path: string, props: Stats, options?: PatchOptions): Promise<void>;
  read<T extends DataType>(
    path: string,
    type?: T,
    options?: ReadOptions
  ): Promise<ReturnData<T> | null>;
  readdir(path: string, options?: ListOptions): Promise<string[] | null>;
  rm(path: string, options?: DeleteOptions): Promise<void>;
  stat(path: string, options?: HeadOptions): Promise<Stats | null>;
  toURL(path: string, options?: URLOptions): Promise<string | null>;
  write(path: string, data: Data, options?: WriteOptions): Promise<void>;
}

export interface Entry {
  fs: FileSystem;
  path: string;

  copy(entry: Entry, options?: CopyOptions): Promise<void>;
  cp(entry: Entry, options?: CopyOptions): Promise<void>;
  del(options?: DeleteOptions): Promise<void>;
  delete(options?: DeleteOptions): Promise<void>;
  getParent(): Promise<Directory>;
  head(options?: HeadOptions): Promise<Stats | null>;
  move(entry: Entry, options?: MoveOptions): Promise<void>;
  mv(entry: Entry, options?: MoveOptions): Promise<void>;
  patch(props: Stats, options?: PatchOptions): Promise<void>;
  remove(options?: DeleteOptions): Promise<void>;
  rm(options?: DeleteOptions): Promise<void>;
  stat(options?: HeadOptions): Promise<Stats | null>;
  toURL(options?: URLOptions): Promise<string | null>;
}

export interface Directory extends Entry {
  dir(options?: ListOptions): Promise<string[] | null>;
  list(options?: ListOptions): Promise<string[] | null>;
  ls(options?: ListOptions): Promise<string[] | null>;
  mkcol(options?: MkcolOptions): Promise<boolean>;
  mkdir(options?: MkcolOptions): Promise<boolean>;
  readdir(options?: ListOptions): Promise<string[] | null>;
}

export interface File extends Entry {
  hash(options?: ReadOptions): Promise<string | null>;
  read<T extends DataType>(
    type?: T,
    options?: ReadOptions
  ): Promise<ReturnData<T> | null>;
  write(data: Data, options?: WriteOptions): Promise<void>;
}

export interface Modification {
  data: Data;
  length?: number;
  start?: number;
}

export const DEFAULT_BUFFER_SIZE = 96 * 1024;
