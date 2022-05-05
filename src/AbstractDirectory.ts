import { AbstractEntry } from "./AbstractEntry";
import { AbstractFile } from "./AbstractFile";
import { AbstractFileSystem } from "./AbstractFileSystem";
import {
  DeleteOptions,
  Directory,
  Entry,
  EntryType,
  HeadOptions,
  Item,
  ListOptions,
  MkcolOptions,
  OnExists,
  OnNoParent,
  OnNotExist,
  Options,
  Stats,
  XmitOptions,
} from "./core";
import {
  isFileSystemError,
  NotFoundError,
  PathExistError,
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
  ) => Promise<boolean | null>;

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

  public async _delete(options: DeleteOptions): Promise<boolean> {
    const fs = this.fs;

    try {
      await this._checkDirectory(options);
    } catch (e) {
      const errors = options.errors;
      if (isFileSystemError(e) && e.name === NotFoundError.name) {
        if (options.onNotExist === OnNotExist.Error) {
          this.fs._handleFileSystemError(e, errors);
          return false;
        }
      } else {
        this._handleNotReadableError(errors, { e });
        return false;
      }
    }

    let result = true;
    if (options.recursive) {
      const children = await this._items(options);
      if (!children) {
        return false;
      }

      for (const child of children) {
        const childEntry = (await fs.getEntry(child.path, {
          type: child.type,
          ignoreHook: options.ignoreHook,
        })) as Entry;
        result = (await childEntry.delete(options)) && result;
      }
    }

    if (result && this.path !== "/") {
      try {
        await this._rmdir();
      } catch (e) {
        this._handleNoModificationAllowedError(options.errors, { e });
        return false;
      }
    }

    return true;
  }

  public async _xmit(to: Entry, options: XmitOptions): Promise<boolean> {
    const fs = this.fs;
    const path = this.path;

    if (to instanceof AbstractFile) {
      this.fs._handleError(TypeMismatchError.name, this.path, options.errors, {
        message: `"${path}" is not a directory`,
      });
      return false;
    }

    const toDir = to as Directory;
    let result = await toDir.mkdir(options);
    if (!result) {
      return false;
    }

    if (!options.recursive) {
      return true;
    }

    const fromItems = await this._items(options);
    if (!fromItems) {
      return false;
    }

    result = true;
    for (const fromItem of fromItems) {
      const fromPath = fromItem.path;
      const fromEntry = (await fs.getEntry(fromPath, {
        type: fromItem.type,
      })) as AbstractEntry;
      const name = getName(fromPath);
      const toPath = joinPaths(toDir.path, name);
      const toEntry = (await (fromEntry instanceof AbstractFile
        ? this.fs.getFile(toPath)
        : this.fs.getDirectory(toPath))) as Entry as AbstractEntry;
      result = (await fromEntry._xmit(toEntry, options)) && result;
    }

    return result;
  }

  public dir = (options?: ListOptions | undefined) => this.list(options);

  public head(options?: HeadOptions): Promise<Stats | null> {
    if (!this.fs.supportDirectory()) {
      return Promise.resolve({});
    }

    options = { ...options, type: EntryType.Directory };
    return this.fs.head(this.path, options);
  }

  public async list(options?: ListOptions): Promise<string[] | null> {
    const items = await this._items(options);
    if (!items) {
      return null;
    }
    return items.map((item) => item.path);
  }

  public ls = (options?: ListOptions | undefined) => this.list(options);

  public async mkcol(options?: MkcolOptions): Promise<boolean> {
    const fs = this.fs;
    if (!fs.supportDirectory()) {
      return true;
    }

    options = { ...this.fs.defaultMkdirOptions, ...options };
    const path = this.path;
    try {
      await this._checkDirectory(options);
      if (options.onExists === OnExists.Error) {
        this.fs._handleError(PathExistError.name, path, options.errors, {
          message: `"${path}" has already existed`,
        });
        return false;
      }
    } catch (e) {
      if (isFileSystemError(e) && e.name === NotFoundError.name) {
        if (options.onNoParent === OnNoParent.MakeParents && path !== "/") {
          const parent = await this.getParent();
          if (!parent) {
            return false;
          }
          await parent.mkcol(options);
        }
      } else {
        this._handleNotReadableError(options.errors, { e });
        return false;
      }
    }

    try {
      if (!options.ignoreHook && this.beforeMkcol) {
        const result = await this.beforeMkcol(path, options);
        if (result != null) {
          return result;
        }
      }
      await this._mkdir();
      if (!options.ignoreHook && this.afterMkcol) {
        await this.afterMkcol(path);
      }
      return true;
    } catch (e) {
      this._handleNoModificationAllowedError(options.errors, { e });
      return false;
    }
  }

  public mkdir = (options?: MkcolOptions | undefined) => this.mkcol(options);

  public readdir = (options?: ListOptions | undefined) => this.list(options);

  public abstract _list(): Promise<Item[]>;
  public abstract _mkdir(): Promise<void>;
  public abstract _rmdir(): Promise<void>;

  protected async _checkDirectory(options: Options): Promise<void> {
    if (!this.fs.supportDirectory) {
      return;
    }

    await this.head({
      type: EntryType.Directory,
      ignoreHook: options?.ignoreHook,
    });
  }

  protected async _items(options?: ListOptions): Promise<Item[] | null> {
    try {
      options = { ...options };
      const path = this.path;

      await this._checkDirectory(options);

      let items: Item[] | null | undefined;
      if (!options.ignoreHook && this.beforeList) {
        items = await this.beforeList(path, options);
      }
      if (!items) {
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
    } catch (e) {
      this._handleNotReadableError(options?.errors, { e });
      return null;
    }
  }
}
