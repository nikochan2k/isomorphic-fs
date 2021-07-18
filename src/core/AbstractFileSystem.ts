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
  MoveOptions,
  PatchOptions,
  Props,
  Stats,
  URLType,
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

  public del = this.delete;
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

  public async delete(
    path: string,
    options: DeleteOptions = { force: false, recursive: false }
  ): Promise<void> {
    const fso = await this.getFileSystemObject(path);
    return fso.delete(options);
  }

  public async head(path: string, options: HeadOptions = {}): Promise<Stats> {
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
    const stats = await this.stat(path);
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
