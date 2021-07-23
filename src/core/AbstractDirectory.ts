import { getName, joinPaths } from "../util/path";
import { AbstractFile } from "./AbstractFile";
import { AbstractFileSystem } from "./AbstractFileSystem";
import { AbstractFileSystemObject } from "./AbstractFileSystemObject";
import {
  DeleteOptions,
  Directory,
  FileSystemObject,
  ListOptions,
  MkcolOptions,
  XmitError,
  XmitOptions,
} from "./core";
import {
  NoModificationAllowedError,
  NotFoundError,
  PathExistsError,
  TypeMismatchError,
} from "./errors";

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

  public async _delete(options: DeleteOptions): Promise<void> {
    try {
      const stats = await this.head();
      if (stats.size != null) {
        throw new TypeMismatchError(
          this.fs.repository,
          this.path,
          `"${this.path}" is not a directory`
        );
      }
    } catch (e) {
      if (e instanceof NotFoundError) {
        if (!options.force) {
          throw e;
        }
      } else {
        throw e;
      }
    }
    if (options.recursive) {
      return this._rmdirRecursively();
    } else {
      return this._rmdir();
    }
  }

  public abstract _rmdir(): Promise<void>;

  public abstract _rmdirRecursively(): Promise<void>;

  public async _xmit(
    to: FileSystemObject,
    copyErrors: XmitError[],
    options: XmitOptions
  ): Promise<void> {
    if (to instanceof AbstractFile) {
      throw new TypeMismatchError(
        to.fs.repository,
        to.path,
        `"${to}" is not a directory`
      );
    }

    const toDir = to as Directory;
    await toDir.mkcol({
      force: options.force,
      recursive: false,
      ignoreHook: options.ignoreHook,
    });
    if (!options.recursive) {
      return;
    }

    const children = await this.list();
    for (const child of children) {
      const stats = await this.fs.head(child);
      const fromFso = (await (stats.size != null
        ? this.fs.getFile(child)
        : this.fs.getDirectory(child))) as unknown as AbstractFileSystemObject;
      const name = getName(child);
      const toPath = joinPaths(toDir.path, name);
      const toFso = (await (stats.size != null
        ? this.fs.getFile(toPath)
        : this.fs.getDirectory(toPath))) as unknown as AbstractFileSystemObject;
      try {
        await fromFso._xmit(toFso, copyErrors, options);
      } catch (error) {
        copyErrors.push({ from: fromFso, to: toFso, error });
      }
    }

    if (options.move) {
      try {
        await this.delete();
      } catch (error) {
        copyErrors.push({ from: this, to, error });
      }
    }
  }

  public async list(options: ListOptions = {}): Promise<string[]> {
    let list: string[] | null | undefined;
    if (!options.ignoreHook && this.beforeList) {
      list = await this.beforeList(this.path, options);
    }
    if (!list) {
      list = await this._list();
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
  public async mkcol(
    options: MkcolOptions = { force: false, recursive: false }
  ): Promise<void> {
    try {
      const stats = await this.head();
      if (stats.size != null) {
        throw new TypeMismatchError(
          this.fs.repository,
          this.path,
          `"${this.path}" is not a directory`
        );
      }
      if (!options.force) {
        throw new PathExistsError(
          this.fs.repository,
          this.path,
          `"${this.path}" has already existed`
        );
      }
      return;
    } catch (e) {
      if (e instanceof NotFoundError) {
        if (options.recursive) {
          const parent = await this.getParent();
          await parent.mkcol({ force: true, recursive: true });
        }
      } else {
        throw new NoModificationAllowedError(this.fs.repository, this.path);
      }
    }
    if (!options.ignoreHook && this.beforeMkcol) {
      if (await this.beforeMkcol(this.path, options)) {
        return;
      }
    }
    await this._mkcol();
    if (!options.ignoreHook && this.afterMkcol) {
      await this.afterMkcol(this.path);
    }
  }

  public abstract _list(): Promise<string[]>;
  public abstract _mkcol(): Promise<void>;
}
