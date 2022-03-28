import { AbstractEntry } from "./AbstractEntry";
import { AbstractFile } from "./AbstractFile";
import { AbstractFileSystem } from "./AbstractFileSystem";
import {
  DeleteOptions,
  Directory,
  Entry,
  EntryType,
  ErrorLike,
  HeadOptions,
  Item,
  ListOptions,
  MkcolOptions,
  Options,
  Stats,
  XmitOptions,
} from "./core";
import {
  createError,
  NotFoundError,
  NotReadableError,
  SecurityError,
  TypeMismatchError,
} from "./errors";
import { getName, joinPaths, normalizePath } from "./util";

export abstract class AbstractDirectory
  extends AbstractEntry
  implements Directory
{
  private afterList?: (path: string, list: Item[]) => Promise<void>;
  private afterMkcol?: (path: string) => Promise<void>;
  private beforeList?: (
    path: string,
    options: ListOptions
  ) => Promise<Item[] | null>;
  private beforeMkcol?: (
    psth: string,
    options: MkcolOptions
  ) => Promise<boolean>;

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
    options: DeleteOptions,
    errors: ErrorLike[]
  ): Promise<void> {
    const fs = this.fs;

    try {
      if (fs.supportDirectory()) {
        await this._checkDirectory(options);
      }
    } catch (e: unknown) {
      const name = (e as Error).name;
      if (name === TypeMismatchError.name) {
        throw e;
      }
      if (name === NotFoundError.name) {
        if (!options.force) {
          throw e;
        }
        return;
      } else {
        throw createError({
          name: NotReadableError.name,
          repository: fs.repository,
          path: this.path,
          e: e as ErrorLike,
        });
      }
    }

    if (options.recursive) {
      const children = await this._items(options);
      for (const child of children) {
        try {
          const childEntry = await fs.getEntry(child.path, {
            type: child.type,
          });
          await childEntry.delete(options);
        } catch (e: unknown) {
          if (options.force) {
            errors.push(e as ErrorLike);
          } else {
            throw e;
          }
        }
      }
    }

    return this._rmdir();
  }

  public async _xmit(
    to: Entry,
    copyErrors: ErrorLike[],
    options: XmitOptions
  ): Promise<void> {
    const fs = this.fs;
    const path = this.path;

    if (to instanceof AbstractFile) {
      throw createError({
        name: TypeMismatchError.name,
        repository: fs.repository,
        path,
        e: { message: `"${path}" is not a directory` },
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

    const fromItems = await this._items();
    for (const fromItem of fromItems) {
      const fromPath = fromItem.path;
      let toPath: string | undefined;
      try {
        const fromEntry = (await fs.getEntry(fromPath, {
          type: fromItem.type,
        })) as AbstractEntry;
        const name = getName(fromPath);
        toPath = joinPaths(toDir.path, name);
        const toEntry = (await (fromEntry instanceof AbstractFile
          ? this.fs.getFile(toPath)
          : this.fs.getDirectory(toPath))) as Entry as AbstractEntry;
        await fromEntry._xmit(toEntry, copyErrors, options);
      } catch (e: unknown) {
        copyErrors.push({ ...(e as ErrorLike), from: fromPath, to: toPath });
      }
    }
  }

  public dir = (options?: ListOptions | undefined) => this.list(options);

  public head(options?: HeadOptions): Promise<Stats> {
    if (!this.fs.supportDirectory()) {
      return Promise.resolve({});
    }

    options = { ...options, type: EntryType.Directory };
    return this.fs.head(this.path, options);
  }

  public async list(options?: ListOptions): Promise<string[]> {
    const items = await this._items(options);
    return items.map((item) => item.path);
  }

  public ls = (options?: ListOptions | undefined) => this.list(options);

  public async mkcol(options?: MkcolOptions): Promise<void> {
    if (!this.fs.supportDirectory()) {
      return;
    }

    options = { force: false, recursive: false, ...options };
    try {
      await this._checkDirectory(options);
      if (!options.force) {
        throw createError({
          name: SecurityError.name,
          repository: this.fs.repository,
          path: this.path,
          e: { message: `"${this.path}" has already existed` },
        });
      }
      return;
    } catch (e: unknown) {
      if ((e as ErrorLike).name === NotFoundError.name) {
        if (options.recursive && this.path !== "/") {
          const parent = await this.getParent();
          await parent.mkcol({
            force: true,
            recursive: true,
            ignoreHook: options.ignoreHook,
          });
        }
      } else {
        throw createError({
          name: NotReadableError.name,
          repository: this.fs.repository,
          path: this.path,
          e: e as ErrorLike,
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

  public mkdir = (options?: MkcolOptions | undefined) => this.mkcol(options);

  public readdir = (options?: ListOptions | undefined) => this.list(options);

  public abstract _list(): Promise<Item[]>;
  public abstract _mkcol(): Promise<void>;
  public abstract _rmdir(): Promise<void>;

  protected async _checkDirectory(options: Options) {
    const path = this.path;
    const stats = await this.fs.head(path, options);
    if (stats.size != null) {
      throw createError({
        name: TypeMismatchError.name,
        repository: this.fs.repository,
        path,
        e: { message: `"${path}" is not a directory` },
      });
    }
  }

  protected async _items(options?: ListOptions): Promise<Item[]> {
    options = { ...options };
    const path = this.path;

    let items: Item[] | null | undefined;
    if (!options.ignoreHook && this.beforeList) {
      items = await this.beforeList(path, options);
    }
    if (!items) {
      if (this.fs.supportDirectory()) {
        await this._checkDirectory(options);
      }
      items = await this._list();
    }
    if (!options.ignoreHook && this.afterList) {
      await this.afterList(path, items);
    }

    for (const item of items) {
      if (item.path.endsWith("/")) {
        if (!item.type) {
          item.type = EntryType.Directory;
        }
        item.path = normalizePath(item.path);
      }
    }

    return items;
  }
}
