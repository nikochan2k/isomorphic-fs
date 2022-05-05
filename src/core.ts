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
  Overwrite = "overwrite",
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

export interface URLOptions extends Options {
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
    from: string,
    to: string,
    options?: CopyOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  cp(
    from: string,
    to: string,
    options?: CopyOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  del(
    path: string,
    options?: DeleteOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  delete(
    path: string,
    options?: DeleteOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  dir(path: string, options?: ListOptions): Promise<string[]>;
  dir(
    path: string,
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  getDirectory(path: string): Promise<Directory>;
  getDirectory(
    path: string,
    errors?: FileSystemError[]
  ): Promise<Directory | null>;
  getFile(path: string): Promise<File>;
  getFile(path: string, errors?: FileSystemError[]): Promise<File | null>;
  hash(path: string, options?: ReadOptions): Promise<string>;
  hash(
    path: string,
    options?: ReadOptions,
    errors?: FileSystemError[]
  ): Promise<string | null>;
  head(path: string, options?: HeadOptions): Promise<Stats>;
  head(
    path: string,
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null>;
  list(path: string, options?: ListOptions): Promise<string[]>;
  list(
    path: string,
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  ls(path: string, options?: ListOptions): Promise<string[]>;
  ls(
    path: string,
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  mkcol(
    path: string,
    options?: MkcolOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  mkdir(
    path: string,
    options?: MkcolOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  move(
    from: string,
    to: string,
    options?: MoveOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  mv(
    from: string,
    to: string,
    options?: MoveOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  patch(
    path: string,
    props: Stats,
    options?: PatchOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  read<T extends DataType>(
    path: string,
    type?: T,
    options?: ReadOptions
  ): Promise<ReturnData<T>>;
  read<T extends DataType>(
    path: string,
    type?: T,
    options?: ReadOptions,
    errors?: FileSystemError[]
  ): Promise<ReturnData<T> | null>;
  readdir(path: string, options?: ListOptions): Promise<string[]>;
  readdir(
    path: string,
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  rm(
    path: string,
    options?: DeleteOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  stat(path: string, options?: HeadOptions): Promise<Stats>;
  stat(
    path: string,
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null>;
  supportDirectory(): boolean;
  toURL(path: string, options?: URLOptions): Promise<string>;
  toURL(
    path: string,
    options?: URLOptions,
    errors?: FileSystemError[]
  ): Promise<string | null>;
  write(path: string, data: Data, options?: WriteOptions): Promise<boolean>;
  write(
    path: string,
    data: Data,
    options?: WriteOptions,
    errors?: FileSystemError[]
  ): Promise<boolean | null>;
}

export interface Entry {
  fs: FileSystem;
  path: string;

  copy(
    to: Entry,
    options?: CopyOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  cp(
    to: Entry,
    options?: CopyOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  del(options?: DeleteOptions, errors?: FileSystemError[]): Promise<boolean>;
  delete(options?: DeleteOptions, errors?: FileSystemError[]): Promise<boolean>;
  getParent(): Promise<Directory>;
  getParent(errors?: FileSystemError[]): Promise<Directory | null>;
  head(options?: HeadOptions): Promise<Stats>;
  head(
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null>;
  move(
    to: Entry,
    options?: MoveOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  mv(
    to: Entry,
    options?: MoveOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  patch(
    props: Stats,
    options?: PatchOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
  remove(options?: DeleteOptions, errors?: FileSystemError[]): Promise<boolean>;
  rm(options?: DeleteOptions, errors?: FileSystemError[]): Promise<boolean>;
  stat(options?: HeadOptions): Promise<Stats>;
  stat(
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null>;
  toURL(options?: URLOptions): Promise<string>;
  toURL(
    options?: URLOptions,
    errors?: FileSystemError[]
  ): Promise<string | null>;
}

export interface Directory extends Entry {
  dir(options?: ListOptions): Promise<string[]>;
  dir(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  list(options?: ListOptions): Promise<string[]>;
  list(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  ls(options?: ListOptions): Promise<string[]>;
  ls(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  mkcol(options?: MkcolOptions, errors?: FileSystemError[]): Promise<boolean>;
  mkdir(options?: MkcolOptions, errors?: FileSystemError[]): Promise<boolean>;
  readdir(options?: ListOptions): Promise<string[]>;
  readdir(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
}

export interface File extends Entry {
  hash(options?: ReadOptions): Promise<string>;
  hash(
    options?: ReadOptions,
    errors?: FileSystemError[]
  ): Promise<string | null>;
  read<T extends DataType>(
    type?: T,
    options?: ReadOptions
  ): Promise<ReturnData<T>>;
  read<T extends DataType>(
    type?: T,
    options?: ReadOptions,
    errors?: FileSystemError[]
  ): Promise<ReturnData<T> | null>;
  write(
    data: Data,
    options?: WriteOptions,
    errors?: FileSystemError[]
  ): Promise<boolean>;
}

export interface Modification {
  data: Data;
  length?: number;
  start?: number;
}

export const DEFAULT_BUFFER_SIZE = 96 * 1024;
