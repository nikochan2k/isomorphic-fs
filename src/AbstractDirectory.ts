import { AbstractEntry } from "./AbstractEntry";
import { AbstractFile } from "./AbstractFile";
import { AbstractFileSystem } from "./AbstractFileSystem";
import {
  Directory,
  Entry,
  ErrorLike,
  ListOptions,
  MkcolOptions,
  Ret,
  UnlinkOptions,
  XmitOptions,
} from "./core";
import {
  createError,
  NotFoundError,
  SecurityError,
  TypeMismatchError,
} from "./errors";
import { getName, joinPaths } from "./util";

export abstract class AbstractDirectory
  extends AbstractEntry
  implements Directory
{
  private afterList?: (path: string, list: string[]) => Promise<void>;
  private afterMkcol?: (path: string) => Promise<void>;
  private beforeList?: (
    path: string,
    options: ListOptions
  ) => Promise<Ret<string[]>>;
  private beforeMkcol?: (
    psth: string,
    options: MkcolOptions
  ) => Promise<Ret<boolean>>;

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

  public async _delete(options: UnlinkOptions): Promise<void> {
    const [stats, eHead] = await this.head({ ignoreHook: options.ignoreHook });
    if (eHead) {
      options.errors.push(eHead);
      return;
    }
    if (stats.size != null) {
      options.errors.push(
        createError({
          name: TypeMismatchError.name,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" is not a directory`,
        })
      );
    }

    const [children, eList] = await this.list();
    if (eList) {
      options.errors.push(eList);
      return;
    }
    for (const child of children) {
      if (!options.force && 0 < options.errors.length) {
        return;
      }
      const [stats, eHead] = await this.fs.head(child, {
        ignoreHook: options.ignoreHook,
      });
      if (eHead) {
        options.errors.push(eHead);
        continue;
      }
      const entry = (await (stats.size != null
        ? this.fs.getFile(child)
        : this.fs.getDirectory(child))) as unknown as AbstractEntry;
      await entry.delete(options);
    }

    const eRmdir = await this._rmdir();
    if (eRmdir) {
      options.errors.push(eRmdir);
    }
  }

  public abstract _rmdir(): Promise<void | ErrorLike>;

  public async _xmit(toEntry: Entry, options: XmitOptions): Promise<void> {
    if (toEntry instanceof AbstractFile) {
      options.errors.push(
        createError({
          name: TypeMismatchError.name,
          repository: this.fs.repository,
          path: this.path,
          e: `"${this.path}" is not a directory`,
        })
      );
      return;
    }

    const toDir = toEntry as Directory;
    const [, eMkcol] = await toDir.mkcol({
      force: options.force,
      recursive: false,
      ignoreHook: options.ignoreHook,
    });
    if (eMkcol) {
      options.errors.push(eMkcol);
      return;
    }
    options.copied++;

    const [children, eList] = await this.list();
    if (eList) {
      options.errors.push(eList);
      return;
    }

    if (options.recursive) {
      for (const child of children) {
        if (!options.force && 0 < options.errors.length) {
          return;
        }
        const [stats, eHead] = await this.fs.head(child, {
          ignoreHook: options.ignoreHook,
        });
        if (eHead) {
          options.errors.push(eHead);
          continue;
        }
        const [fromEntry, eFrom] = await (stats.size != null
          ? this.fs.getFile(child)
          : this.fs.getDirectory(child));
        if (eFrom) {
          options.errors.push(eFrom);
          continue;
        }
        const name = getName(child);
        const toPath = joinPaths(toDir.path, name);
        const [toEntry, eTo] = await (stats.size != null
          ? this.fs.getFile(toPath)
          : this.fs.getDirectory(toPath));
        if (eTo) {
          options.errors.push(eTo);
          continue;
        }
        await (fromEntry as never as AbstractEntry)._xmit(toEntry, options);
      }
    }

    if (options.move) {
      const [, errors] = await this.delete({
        force: options.force,
        recursive: false,
      });
      if (errors) {
        Array.prototype.push.apply(options.errors, errors);
        return;
      }
      options.moved++;
    }
  }

  public async list(options: ListOptions = {}): Promise<Ret<string[]>> {
    if (!options.ignoreHook && this.beforeList) {
      const result = await this.beforeList(this.path, options);
      if (result) return result;
    }
    const [list, e] = await this._list();
    if (e) return [undefined as never, e];
    if (!options.ignoreHook && this.afterList) {
      await this.afterList(this.path, list);
    }
    return [list, undefined as never];
  }

  /**
   * Create a directory.
   * @param options Either the file mode, or an object optionally specifying the file mode and whether parent folders
   */
  public async mkcol(
    options: MkcolOptions = { force: false, recursive: false }
  ): Promise<Ret<boolean>> {
    const [stats, eHead] = await this.head({ ignoreHook: options.ignoreHook });
    if (eHead) {
      if (eHead.name !== NotFoundError.name) {
        return [undefined as never, eHead];
      }
      if (options.recursive) {
        const [parent, e] = await this.getParent();
        if (e) return [undefined as never, e];
        await parent.mkcol({ force: true, recursive: true });
      }
    } else {
      if (stats.size != null) {
        return [
          false as never,
          createError({
            name: TypeMismatchError.name,
            repository: this.fs.repository,
            path: this.path,
            e: `"${this.path}" is not a directory`,
          }),
        ];
      }
      if (!options.force) {
        return [
          false as never,
          createError({
            name: SecurityError.name,
            repository: this.fs.repository,
            path: this.path,
            e: `"${this.path}" has already existed`,
          }),
        ];
      }
      return [false, undefined as never];
    }
    if (!options.ignoreHook && this.beforeMkcol) {
      const result = await this.beforeMkcol(this.path, options);
      if (result) return result;
    }
    const [result, e] = await this._mkcol();
    if (e) return [undefined as never, e];

    if (!options.ignoreHook && this.afterMkcol) {
      await this.afterMkcol(this.path);
    }
    return [result, undefined as never];
  }

  public abstract _list(): Promise<Ret<string[]>>;
  public abstract _mkcol(): Promise<Ret<boolean>>;
}
