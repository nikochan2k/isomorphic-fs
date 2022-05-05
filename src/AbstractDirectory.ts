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
  FileSystemError,
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
  private readonly afterList?: (path: string, list: Item[]) => Promise<void>;
  private readonly afterMkcol?: (path: string) => Promise<void>;
  private readonly beforeList?: (
    path: string,
    options: ListOptions
  ) => Promise<Item[] | null>;
  private readonly beforeMkcol?: (
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

  public async _delete(
    options: DeleteOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    const fs = this.fs;

    try {
      await this._exists(options);
    } catch (e) {
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
      const children = await this._items(options, errors);
      if (!children) {
        return false;
      }

      for (const child of children) {
        const childEntry = await fs.getEntry(
          child.path,
          {
            type: child.type,
            ignoreHook: options.ignoreHook,
          },
          errors
        );
        if (!childEntry) {
          continue;
        }
        result = (await childEntry.delete(options, errors)) && result;
      }
    }

    if (result && this.path !== "/") {
      try {
        await this._rmdir();
      } catch (e) {
        this._handleNoModificationAllowedError(errors, { e });
        return false;
      }
    }

    return true;
  }

  public async _xmit(
    to: Entry,
    options: XmitOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    const fs = this.fs;
    const path = this.path;

    if (to instanceof AbstractFile) {
      this.fs._handleError(TypeMismatchError.name, this.path, errors, {
        message: `"${path}" is not a directory`,
      });
      return false;
    }

    const toDir = to as Directory;
    let result = await toDir.mkdir(options, errors);
    if (!result) {
      return false;
    }

    if (!options.recursive) {
      return true;
    }

    const fromItems = await this._items(options, errors);
    if (!fromItems) {
      return false;
    }

    result = true;
    for (const fromItem of fromItems) {
      const fromPath = fromItem.path;
      const fromEntry = await fs.getEntry(
        fromPath,
        {
          type: fromItem.type,
        },
        errors
      );
      const name = getName(fromPath);
      const toPath = joinPaths(toDir.path, name);
      let res: boolean;
      if (fromEntry instanceof AbstractFile) {
        const toEntry = await this.fs.getFile(toPath, errors);
        if (!toEntry) {
          continue;
        }
        res = await fromEntry._xmit(toEntry, options, errors);
      } else if (fromEntry instanceof AbstractDirectory) {
        const toEntry = await this.fs.getDirectory(toPath, errors);
        if (!toEntry) {
          continue;
        }
        res = await fromEntry._xmit(toEntry, options, errors);
      } else {
        continue;
      }
      result = res && result;
    }

    return result;
  }

  public dir(options?: ListOptions): Promise<string[]>;
  public dir(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  public dir(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null> {
    return this.list(options, errors);
  }

  public head(options?: HeadOptions): Promise<Stats>;
  public head(
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null>;
  public head(
    options?: HeadOptions,
    errors?: FileSystemError[]
  ): Promise<Stats | null> {
    if (!this.fs.supportDirectory()) {
      return Promise.resolve({});
    }

    options = { ...options, type: EntryType.Directory };
    return this.fs.head(this.path, options, errors);
  }

  public async list(options?: ListOptions): Promise<string[]>;
  public async list(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  public async list(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null> {
    options = { ...options };
    await this._exists(options);
    const items = await this._items(options, errors);
    if (!items) {
      return null;
    }
    return items.map((item) => item.path);
  }

  public ls(options?: ListOptions): Promise<string[]>;
  public ls(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  public ls(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null> {
    return this.list(options, errors);
  }

  public async mkcol(
    options?: MkcolOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    const fs = this.fs;
    if (!fs.supportDirectory()) {
      return true;
    }

    options = { ...this.fs.defaultMkdirOptions, ...options };
    const path = this.path;
    try {
      await this._exists(options);
      if (options.onExists === OnExists.Error) {
        this.fs._handleError(PathExistError.name, path, errors, {
          message: `"${path}" has already existed`,
        });
        return false;
      }
    } catch (e) {
      if (isFileSystemError(e) && e.name === NotFoundError.name) {
        if (options.onNoParent === OnNoParent.MakeParents && path !== "/") {
          const parent = await this.getParent(errors);
          if (!parent) {
            return false;
          }
          const result = await parent.mkcol(options, errors);
          if (!result) {
            return false;
          }
        }
      } else {
        this._handleNotReadableError(errors, { e });
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
      this._handleNoModificationAllowedError(errors, { e });
      return false;
    }
  }

  public mkdir = (options?: MkcolOptions) => this.mkcol(options);

  public readdir(options?: ListOptions): Promise<string[]>;
  public readdir(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null>;
  public readdir(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<string[] | null> {
    return this.list(options, errors);
  }

  public abstract _list(): Promise<Item[]>;
  public abstract _mkdir(): Promise<void>;
  public abstract _rmdir(): Promise<void>;

  protected async _exists(options: Options): Promise<Stats> {
    return this.stat({
      type: EntryType.Directory,
      ignoreHook: options?.ignoreHook,
    });
  }

  protected async _items(
    options?: ListOptions,
    errors?: FileSystemError[]
  ): Promise<Item[] | null> {
    try {
      options = { ...options };
      const path = this.path;

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
      this._handleNotReadableError(errors, { e });
      return null;
    }
  }
}
