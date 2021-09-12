import { getName, joinPaths } from "./util";
import { AbstractFile } from "./AbstractFile";
import { AbstractFileSystem } from "./AbstractFileSystem";
import { AbstractEntry } from "./AbstractEntry";
import {
  DeleteOptions,
  Directory,
  Entry,
  ListOptions,
  MkcolOptions,
  XmitError,
  XmitOptions,
} from "./core";
import {
  createError,
  NotFoundError,
  NotReadableError,
  SecurityError,
  TypeMismatchError,
} from "./errors";

export abstract class AbstractDirectory
  extends AbstractEntry
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

  public async _delete(
    options: DeleteOptions = { force: false, recursive: false }
  ): Promise<void> {
    try {
      const stats = await this.head();
      if (stats.size != null) {
        throw createError({
          name: TypeMismatchError.name,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" is not a directory`,
        });
      }
    } catch (e) {
      if (e.name === NotFoundError.name) {
        if (!options.force) {
          throw e;
        }
      } else {
        throw createError({
          name: NotReadableError.name,
          repository: this.fs.repository,
          path: this.path,
          e,
        });
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
    to: Entry,
    copyErrors: XmitError[],
    options: XmitOptions
  ): Promise<void> {
    if (to instanceof AbstractFile) {
      throw createError({
        name: TypeMismatchError.name,
        repository: this.fs.repository,
        path: this.path,
        e: `"${this.path}" is not a directory`,
      });
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
      const fromEntry = (await (stats.size != null
        ? this.fs.getFile(child)
        : this.fs.getDirectory(child))) as unknown as AbstractEntry;
      const name = getName(child);
      const toPath = joinPaths(toDir.path, name);
      const toEntry = (await (stats.size != null
        ? this.fs.getFile(toPath)
        : this.fs.getDirectory(toPath))) as unknown as AbstractEntry;
      try {
        await fromEntry._xmit(toEntry, copyErrors, options);
      } catch (error) {
        copyErrors.push({ from: fromEntry, to: toEntry, error });
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
        throw createError({
          name: TypeMismatchError.name,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" is not a directory`,
        });
      }
      if (!options.force) {
        throw createError({
          name: SecurityError.name,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" has already existed`,
        });
      }
      return;
    } catch (e) {
      if (e.name === NotFoundError.name) {
        if (options.recursive) {
          const parent = await this.getParent();
          await parent.mkcol({ force: true, recursive: true });
        }
      } else {
        throw createError({
          name: NotReadableError.name,
          repository: this.fs.repository,
          path: this.path,
          e,
        });
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
