import { normalizePath } from "../util/path";
import { AbstractFile } from "./AbstractFile";
import {
  CopyOptions,
  DeleteOptions,
  Directory,
  File,
  FileSystem,
  FileSystemObject,
  FileSystemOptions,
  HeadOptions,
  ListOptions,
  MkcolOptions,
  MoveOptions,
  OpenOptions,
  OpenReadOptions,
  OpenWriteOptions,
  PatchOptions,
  Props,
  ReadStream,
  Source,
  Stats,
  URLType,
  WriteStream,
  XmitError,
} from "./core";

export abstract class AbstractFileSystem implements FileSystem {
  private afterHead?: (path: string, stats: Stats) => Promise<void>;
  private afterPatch?: (path: string) => Promise<void>;
  private beforeHead?: (
    path: string,
    options: HeadOptions
  ) => Promise<Stats | null>;
  private beforePatch?: (
    path: string,
    props: Props,
    options: PatchOptions
  ) => Promise<boolean>;

  public cp = this.copy;
  public del = this.delete;
  public ls = this.list;
  public mkdir = this.mkcol;
  public mv = this.move;
  public readdir = this.list;
  public rm = this.delete;
  public stat = this.head;

  constructor(
    public readonly repository: string,
    public readonly options: FileSystemOptions = {}
  ) {
    const hook = options.hook;
    this.beforeHead = hook?.beforeHead;
    this.beforePatch = hook?.beforePatch;
    this.afterHead = hook?.afterHead;
    this.afterPatch = hook?.afterPatch;
  }

  public async copy(
    fromPath: string,
    toPath: string,
    options: CopyOptions = { force: false, recursive: false }
  ): Promise<XmitError[]> {
    const { from, to } = await this._prepareXmit(fromPath, toPath);
    return from.copy(to, options);
  }

  public async createReadStream(
    path: string,
    options: OpenReadOptions = {}
  ): Promise<ReadStream> {
    const file = await this.getFile(path);
    return file.createReadStream(options);
  }

  public async createWriteStream(
    path: string,
    options: OpenWriteOptions = { create: true, append: false }
  ): Promise<WriteStream> {
    const file = await this.getFile(path);
    return file.createWriteStream(options);
  }

  public async delete(
    path: string,
    options: DeleteOptions = { force: false, recursive: false }
  ): Promise<void> {
    const fso = await this.getFileSystemObject(path);
    return fso.delete(options);
  }

  public async hash(path: string, options: OpenOptions = {}): Promise<string> {
    const file = await this.getFile(path);
    return file.hash(options);
  }

  public async head(path: string, options: HeadOptions = {}): Promise<Stats> {
    path = normalizePath(path);
    let stats: Stats | null | undefined;
    if (!options.ignoreHook && this.beforeHead) {
      stats = await this.beforeHead(path, options);
    }
    if (!stats) {
      stats = await this._head(path, options);
    }
    if (!options.ignoreHook && this.afterHead) {
      await this.afterHead(path, stats);
    }
    return stats;
  }

  public async list(path: string, options?: ListOptions): Promise<string[]> {
    const dir = await this.getDirectory(path);
    return dir.list(options);
  }

  public async mkcol(path: string, options?: MkcolOptions): Promise<void> {
    const dir = await this.getDirectory(path);
    return dir.mkcol(options);
  }

  public async move(
    fromPath: string,
    toPath: string,
    options: MoveOptions = { force: false }
  ): Promise<XmitError[]> {
    const { from, to } = await this._prepareXmit(fromPath, toPath);
    return from.move(to, options);
  }

  public async patch(
    path: string,
    props: Props,
    options: PatchOptions = {}
  ): Promise<void> {
    path = normalizePath(path);
    if (this.beforePatch) {
      if (await this.beforePatch(path, props, options)) {
        return;
      }
    }
    await this._patch(path, props, options);
    if (this.afterPatch) {
      await this.afterPatch(path);
    }
  }

  public async readAll(
    path: string,
    options: OpenReadOptions = {}
  ): Promise<Source> {
    const file = await this.getFile(path);
    return file.readAll(options);
  }

  public async writeAll(
    path: string,
    value: Source,
    options: OpenWriteOptions = { create: true, append: false }
  ): Promise<number> {
    const file = await this.getFile(path);
    return file.writeAll(value, options);
  }

  public abstract _head(path: string, options: HeadOptions): Promise<Stats>;
  public abstract _patch(
    path: string,
    props: Props,
    options: PatchOptions
  ): Promise<void>;
  /**
   * Get a directory.
   * @param path A path to a directory.
   * @param options
   */
  public abstract getDirectory(path: string): Promise<Directory>;
  /**
   * Get a file.
   * @param path A path to a file.
   * @param options
   */
  public abstract getFile(path: string): Promise<File>;
  public abstract toURL(path: string, urlType?: URLType): Promise<string>;

  protected async getFileSystemObject(path: string): Promise<FileSystemObject> {
    const stats = await this.head(path);
    return stats.size != null ? this.getFile(path) : this.getDirectory(path);
  }

  private async _prepareXmit(fromPath: string, toPath: string) {
    const from = await this.getFileSystemObject(fromPath);
    const to = await (from instanceof AbstractFile
      ? this.getFile(toPath)
      : this.getDirectory(toPath));
    return { from, to };
  }
}
