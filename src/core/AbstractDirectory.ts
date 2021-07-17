import {
  Directory,
  FileSystemObject,
  ListOptions,
  MkcolOptions,
  XmitError,
  XmitOptions,
} from "./core";
import { AbstractFileSystemObject } from "./AbstractFileSystemObject";
import { AbstractFileSystem } from "./AbstractFileSystem";
import { getName, joinPaths } from "../util/path";
import { InvalidModificationError } from "./errors";
import { AbstractFile } from "./AbstractFile";

export abstract class AbstractDirectory
  extends AbstractFileSystemObject
  implements Directory
{
  private afterList?: (path: string, list: string[]) => Promise<void>;
  private afterMkcol?: (path: string) => Promise<void>;
  private beforeList?: (
    path: string,
    options: ListOptions
  ) => Promise<string[] | null>;
  private beforeMkcol?: (
    psth: string,
    options: MkcolOptions
  ) => Promise<boolean>;

  public ls = this.list;
  public mkdir = this.mkcol;
  public readdir = this.list;

  constructor(fs: AbstractFileSystem, path: string) {
    super(fs, path);
    const hook = fs.options?.hook;
    if (hook) {
      this.beforeMkcol = hook.beforeMkcol;
      this.beforeList = hook.beforeList;
      this.afterMkcol = hook.afterMkcol;
      this.afterList = hook.afterList;
    }
  }

  public async _xmit(
    fso: FileSystemObject,
    move: boolean,
    copyErrors: XmitError[],
    options: XmitOptions = {}
  ): Promise<void> {
    await this.head(); // check if this directory exists
    if (fso instanceof AbstractFile) {
      throw new InvalidModificationError(
        fso.fs.repository,
        fso.path,
        `Cannot copy a directory "${this}" to a file "${fso}"`
      );
    }

    const toDir = fso as Directory;
    await toDir.mkcol({ ignoreHook: options.ignoreHook });

    const children = await this.list();
    for (const child of children) {
      const stats = await this.fs.head(child);
      const fromFso = (await (stats.size
        ? this.fs.getFile(child)
        : this.fs.getDirectory(child))) as unknown as AbstractFileSystemObject;
      const name = getName(child);
      const toPath = joinPaths(toDir.path, name);
      const toFso = (await (stats.size
        ? this.fs.getFile(toPath)
        : this.fs.getDirectory(toPath))) as unknown as AbstractFileSystemObject;
      try {
        await fromFso._xmit(toFso, move, copyErrors, options);
        if (move) {
          try {
            await fromFso.delete();
          } catch (error) {
            copyErrors.push({ from: fromFso, to: toFso, error });
          }
        }
      } catch (error) {
        copyErrors.push({ from: fromFso, to: toFso, error });
      }
    }
  }

  public async list(options: ListOptions = {}): Promise<string[]> {
    let list: string[] | null | undefined;
    if (!options.ignoreHook && this.beforeList) {
      list = await this.beforeList(this.path, options);
    }
    if (!list) {
      list = await this._list(options);
    }
    if (!options.ignoreHook && this.afterList) {
      await this.afterList(this.path, list);
    }
    return list;
  }

  /**
   * Create a directory.
   * @param options Either the file mode, or an object optionally specifying the file mode and whether parent folders
   */
  public async mkcol(options: MkcolOptions = {}): Promise<void> {
    if (!options.ignoreHook && this.beforeMkcol) {
      if (await this.beforeMkcol(this.path, options)) {
        return;
      }
    }
    await this._mkcol(options);
    if (!options.ignoreHook && this.afterMkcol) {
      await this.afterMkcol(this.path);
    }
  }

  public abstract _list(options: ListOptions): Promise<string[]>;
  public abstract _mkcol(options: MkcolOptions): Promise<void>;
}
