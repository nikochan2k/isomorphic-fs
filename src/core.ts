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
  defaultCopyOptions?: CopyOptions;
  defaultDeleteOptions?: DeleteOptions;
  defaultMkdirOptions?: MkcolOptions;
  defaultMoveOptions?: MoveOptions;
  hook?: Hook;
}

export type URLType = "GET" | "POST" | "PUT" | "DELETE";

export interface Options {
  errors?: FileSystemError[];
  ignoreHook?: boolean;
}

export enum OnNotExist {
  Error = "error",
  Ignore = "ignore",
}

export interface DeleteOptions extends Options {
  onNotExist: OnNotExist;
  recursive: boolean;
}

export enum EntryType {
  File = "file" /** File */,
  Directory = "directory" /** Directory */,
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

export enum OnExists {
  Error = "error",
  Ignore = "ignore",
}

export enum OnNoParent {
  Error = "error",
  MakeParents = "make_parents",
}

export interface MkcolOptions extends Options {
  onExists: OnExists;
  onNoParent: OnNoParent;
}
export interface ReadOptions extends Options, Partial<ConvertOptions> {}

export interface WriteOptions extends Options, Partial<ConvertOptions> {
  append?: boolean;
  create?: boolean;
}

export interface MoveOptions extends Options {
  bufferSize?: number;
  onExists: OnExists;
  onNoParent: OnNoParent;
}

export interface CopyOptions extends Options {
  bufferSize?: number;
  onExists: OnExists;
  onNoParent: OnNoParent;
  recursive: boolean;
}
export interface XmitOptions extends Options {
  bufferSize?: number;
  onExists: OnExists;
  onNoParent: OnNoParent;
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
  beforeDelete?: (
    path: string,
    options: DeleteOptions
  ) => Promise<boolean | null>;
  beforeGet?: (path: string, options: ReadOptions) => Promise<Data | null>;
  beforeHead?: (path: string, options: HeadOptions) => Promise<Stats | null>;
  beforeList?: (path: string, options: ListOptions) => Promise<Item[] | null>;
  beforeMkcol?: (
    path: string,
    options: MkcolOptions
  ) => Promise<boolean | null>;
  beforePatch?: (
    path: string,
    props: Stats,
    options: PatchOptions
  ) => Promise<boolean | null>;
  beforePost?: (
    path: string,
    data: Data,
    stats: Stats | undefined,
    options: WriteOptions
  ) => Promise<boolean | null>;
  beforePut?: (
    path: string,
    data: Data,
    stats: Stats | undefined,
    options: WriteOptions
  ) => Promise<boolean | null>;
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

  copy(
    fromPath: string,
    toPath: string,
    options?: CopyOptions
  ): Promise<boolean>;
  cp(fromPath: string, toPath: string, options?: CopyOptions): Promise<boolean>;
  del(path: string, options?: DeleteOptions): Promise<boolean>;
  delete(path: string, options?: DeleteOptions): Promise<boolean>;
  dir(path: string, options?: ListOptions): Promise<string[] | null>;
  getDirectory(path: string, options?: Options): Promise<Directory | null>;
  getFile(path: string, options?: Options): Promise<File | null>;
  hash(path: string, options?: ReadOptions): Promise<string | null>;
  head(path: string, options?: HeadOptions): Promise<Stats | null>;
  list(path: string, options?: ListOptions): Promise<string[] | null>;
  ls(path: string, options?: ListOptions): Promise<string[] | null>;
  mkcol(path: string, options?: MkcolOptions): Promise<boolean>;
  mkdir(path: string, options?: MkcolOptions): Promise<boolean>;
  move(
    fromPath: string,
    toPath: string,
    options?: MoveOptions
  ): Promise<boolean>;
  mv(fromPath: string, toPath: string, options?: MoveOptions): Promise<boolean>;
  patch(path: string, props: Stats, options?: PatchOptions): Promise<boolean>;
  read<T extends DataType>(
    path: string,
    type?: T,
    options?: ReadOptions
  ): Promise<ReturnData<T> | null>;
  readdir(path: string, options?: ListOptions): Promise<string[] | null>;
  rm(path: string, options?: DeleteOptions): Promise<boolean>;
  stat(path: string, options?: HeadOptions): Promise<Stats | null>;
  supportDirectory(): boolean;
  toURL(path: string, options?: URLOptions): Promise<string | null>;
  write(
    path: string,
    data: Data,
    options?: WriteOptions
  ): Promise<boolean | null>;
}

export interface Entry {
  fs: FileSystem;
  path: string;

  copy(entry: Entry, options?: CopyOptions): Promise<boolean>;
  cp(entry: Entry, options?: CopyOptions): Promise<boolean>;
  del(options?: DeleteOptions): Promise<boolean>;
  delete(options?: DeleteOptions): Promise<boolean>;
  getParent(): Promise<Directory | null>;
  head(options?: HeadOptions): Promise<Stats | null>;
  move(entry: Entry, options?: MoveOptions): Promise<boolean>;
  mv(entry: Entry, options?: MoveOptions): Promise<boolean>;
  patch(props: Stats, options?: PatchOptions): Promise<boolean>;
  remove(options?: DeleteOptions): Promise<boolean>;
  rm(options?: DeleteOptions): Promise<boolean>;
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
  write(data: Data, options?: WriteOptions): Promise<boolean>;
}

export interface Modification {
  data: Data;
  length?: number;
  start?: number;
}

export const DEFAULT_BUFFER_SIZE = 96 * 1024;
