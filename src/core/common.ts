import { ReadStream, WriteStream } from "./core";

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
