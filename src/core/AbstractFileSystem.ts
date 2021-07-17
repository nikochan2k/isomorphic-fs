import {
  DeleteOptions,
  Directory,
  FileSystem,
  FileSystemOptions,
  HeadOptions,
  PatchOptions,
  Props,
  Stats,
  URLType,
  XmitError,
  XmitOptions,
  File,
} from "./common";

export abstract class AbstractFileSystem implements FileSystem {
  private afterDelete?: (path: string) => Promise<void>;
  private afterHead?: (path: string, stats: Stats) => Promise<void>;
  private afterPatch?: (path: string) => Promise<void>;
  private beforeDelete?: (
    path: string,
    options: DeleteOptions
  ) => Promise<boolean>;
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
    this.beforeDelete = hook?.beforeDelete;
    this.beforeHead = hook?.beforeHead;
    this.beforePatch = hook?.beforePatch;
    this.afterDelete = hook?.afterDelete;
    this.afterHead = hook?.afterHead;
    this.afterPatch = hook?.afterPatch;
  }

  public async copy(
    fromPath: string,
    toPath: string,
    options: XmitOptions = {}
  ): Promise<XmitError[]> {
    const { from, to } = await this._prepareXmit(fromPath, toPath);
    return from.copy(to, options);
  }

  public async delete(
    path: string,
    options: DeleteOptions = {}
  ): Promise<void> {
    if (!options.ignoreHook && this.beforeDelete) {
      if (await this.beforeDelete(path, options)) {
        return;
      }
    }
    await this._delete(path, options);
    if (!options.ignoreHook && this.afterDelete) {
      await this.afterDelete(path);
    }
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
    options: XmitOptions = {}
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

  public abstract _delete(path: string, options: DeleteOptions): Promise<void>;
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

  private async _prepareXmit(fromPath: string, toPath: string) {
    const stats = await this.stat(fromPath);
    const from = await (stats.size
      ? this.getFile(fromPath)
      : this.getDirectory(fromPath));
    const to = await (stats.size
      ? this.getFile(toPath)
      : this.getDirectory(toPath));
    return { from, to };
  }
}
