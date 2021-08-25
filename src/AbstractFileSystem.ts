import { AbstractFile } from "./AbstractFile";
import {
  CopyOptions,
  DeleteOptions,
  Directory,
  File,
  FileSystem,
  Entry,
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
  ErrorLike,
  Ret,
  Ret2,
} from "./core";
import { normalizePath } from "./util";

export abstract class AbstractFileSystem implements FileSystem {
  private afterHead?: (path: string, stats: Stats) => Promise<void>;
  private afterPatch?: (path: string) => Promise<void>;
  private beforeHead?: (
    path: string,
    options: HeadOptions
  ) => Promise<Ret<Stats> | null>;
  private beforePatch?: (
    path: string,
    props: Props,
    options: PatchOptions
  ) => Promise<Ret<boolean> | null>;

  public cp = this.copy;
  public del = this.delete;
  public ls = this.list;
  public mkdir = this.mkcol;
  public mv = this.move;
  public readdir = this.list;
  public rm = this.delete;
  public stat = this.head;
  public unlink = this.delete;

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
  ): Promise<Ret2<number>> {
    let [entries, e] = await this._prepareXmit(
      fromPath,
      toPath,
      options.ignoreHook
    );
    if (e) return [0, [e]];
    entries = entries as { from: Entry; to: Entry };
    return entries.from.copy(entries.to, options);
  }

  public async createReadStream(
    path: string,
    options: OpenReadOptions = {}
  ): Promise<Ret<ReadStream>> {
    const [file, e] = await this.getFile(path);
    if (e) return [undefined as never, e];
    return file.createReadStream(options);
  }

  public async createWriteStream(
    path: string,
    options: OpenWriteOptions = { create: true, append: false }
  ): Promise<Ret<WriteStream>> {
    const [file, e] = await this.getFile(path);
    if (e) {
      return [undefined as never, e];
    }
    return file.createWriteStream(options);
  }

  public async delete(
    path: string,
    options: DeleteOptions = { force: false, recursive: false }
  ): Promise<Ret2<number>> {
    const [entry, e] = await this.getEntry(path, options.ignoreHook);
    if (e) return [0, [e]];
    return entry.delete(options);
  }

  public async hash(
    path: string,
    options: OpenOptions = {}
  ): Promise<Ret<string>> {
    const [file, e] = await this.getFile(path);
    if (e) return [undefined as never, e];
    return file.hash(options);
  }

  public async head(
    path: string,
    options: HeadOptions = {}
  ): Promise<Ret<Stats>> {
    path = normalizePath(path);
    if (!options.ignoreHook && this.beforeHead) {
      const ret = await this.beforeHead(path, options);
      if (ret) {
        const [, e] = ret;
        if (e) return [undefined as never, e];
        return ret;
      }
    }
    const [stats, e] = await this._head(path, options);
    if (e) return [undefined as never, e];
    if (!options.ignoreHook && this.afterHead)
      await this.afterHead(path, stats);
    return [stats, e];
  }

  public async list(
    path: string,
    options?: ListOptions
  ): Promise<Ret<string[]>> {
    const [dir, e] = await this.getDirectory(path);
    if (e) return [undefined as never, e];
    return dir.list(options);
  }

  public async mkcol(
    path: string,
    options?: MkcolOptions
  ): Promise<Ret<boolean>> {
    const [dir, e] = await this.getDirectory(path);
    if (e) return [undefined as never, e];
    return dir.mkcol(options);
  }

  public async move(
    fromPath: string,
    toPath: string,
    options: MoveOptions = { force: false }
  ): Promise<[number, ErrorLike[]]> {
    let [entries, e] = await this._prepareXmit(
      fromPath,
      toPath,
      options.ignoreHook
    );
    if (e) return [0, [e]];
    entries = entries as { from: Entry; to: Entry };
    return entries.from.move(entries.to, options);
  }

  public async patch(
    path: string,
    props: Props,
    options: PatchOptions = {}
  ): Promise<Ret<boolean>> {
    path = normalizePath(path);
    if (!options.ignoreHook && this.beforePatch) {
      const result = await this.beforePatch(path, props, options);
      if (result) {
        return result;
      }
    }
    await this._patch(path, props, options);
    if (this.afterPatch) {
      await this.afterPatch(path);
    }
    return [true, undefined as never];
  }

  public async readAll(
    path: string,
    options: OpenReadOptions = {}
  ): Promise<Ret<Source>> {
    const [file, e] = await this.getFile(path);
    if (e) return [undefined as never, e];
    return file.readAll(options);
  }

  public async writeAll(
    path: string,
    value: Source,
    options: OpenWriteOptions = { create: true, append: false }
  ): Promise<Ret<number>> {
    const [file, e] = await this.getFile(path);
    if (e) return [undefined as never, e];
    return file.writeAll(value, options);
  }

  public abstract _head(
    path: string,
    options: HeadOptions
  ): Promise<Ret<Stats>>;
  public abstract _patch(
    path: string,
    props: Props,
    options: PatchOptions
  ): Promise<Ret<boolean>>;
  /**
   * Get a directory.
   * @param path A path to a directory.
   * @param options
   */
  public abstract getDirectory(path: string): Promise<Ret<Directory>>;
  /**
   * Get a file.
   * @param path A path to a file.
   * @param options
   */
  public abstract getFile(path: string): Promise<Ret<File>>;
  public abstract toURL(path: string, urlType?: URLType): Promise<Ret<string>>;

  protected async getEntry(
    path: string,
    ignoreHook?: boolean
  ): Promise<Ret<Entry>> {
    let [stats, e] = await this.head(path, { ignoreHook });
    if (e) return [undefined as never, e];
    stats = stats as Stats;
    return stats.size != null ? this.getFile(path) : this.getDirectory(path);
  }

  private async _prepareXmit(
    fromPath: string,
    toPath: string,
    ignoreHook?: boolean
  ): Promise<Ret<{ from: Entry; to: Entry }>> {
    let [from, eFrom] = await this.getEntry(fromPath, ignoreHook);
    if (eFrom) return [undefined as never, eFrom];
    const [to, eTo] = await (from instanceof AbstractFile
      ? this.getFile(toPath)
      : this.getDirectory(toPath));
    if (eTo) return [undefined as never, eTo];
    return [{ from, to }, undefined as never];
  }
}
