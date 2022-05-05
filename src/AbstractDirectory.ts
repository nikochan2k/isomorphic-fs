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

  public async _delete(options: DeleteOptions): Promise<void> {
    const fs = this.fs;

    try {
      await this._checkDirectory();
    } catch (e) {
      const errors = options.errors;
      if (isFileSystemError(e) && e.name !== NotFoundError.name) {
        if (!options.force) {
          this.fs._handleFileSystemError(e, options.errors);
        }
      } else {
        this._handleNotReadableError(errors, { e });
      }
      return;
    }

    if (options.recursive) {
      const children = await this._items(options);
      for (const child of children) {
        const childEntry = await fs.getEntry(child.path, {
          type: child.type,
          ignoreHook: options.ignoreHook,
        });
        if (!childEntry) {
          continue;
        }
        await childEntry.delete(options);
      }
    }

    if (this.path !== "/") {
      await this._rmdir();
    }
  }

  public async _xmit(to: Entry, options: XmitOptions): Promise<void> {
    const fs = this.fs;
    const path = this.path;

    if (to instanceof AbstractFile) {
      this.fs._handleError(TypeMismatchError.name, this.path, options.errors, {
        message: `"${path}" is not a directory`,
      });
      return;
    }

    const toDir = to as Directory;
    await toDir.mkcol({
      force: options.force ?? true,
      recursive: false,
      ignoreHook: options.ignoreHook,
    });

    if (!options.recursive) {
      return;
    }

    const fromItems = await this._items();
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
      try {
        await fromEntry._xmit(toEntry, options);
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this._handleNoModificationAllowedError(options.errors, {
          ...(e as any), // eslint-disable-line @typescript-eslint/no-explicit-any
          from: fromPath,
          to: toPath,
        });
      }
    }
  }

  public dir = (options?: ListOptions | undefined) => this.list(options);

  public head(options?: HeadOptions): Promise<Stats | null> {
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

  public async mkcol(options?: MkcolOptions): Promise<boolean> {
    const fs = this.fs;
    if (!fs.supportDirectory()) {
      return false;
    }

    options = { force: false, recursive: false, ...options };
    const path = this.path;
    try {
      await this._checkDirectory();
      if (!options.force) {
        this.fs._handleError(PathExistError.name, path, options.errors, {
          message: `"${path}" has already existed`,
        });
        return false;
      }
    } catch (e) {
      if (isFileSystemError(e) && e.name === NotFoundError.name) {
        if (options.recursive && path !== "/") {
          const parent = await this.getParent();
          await parent.mkcol(options);
        }
      } else {
        this._handleNotReadableError(options.errors, { e });
        return false;
      }
    }

    try {
      if (!options.ignoreHook && this.beforeMkcol) {
        if (await this.beforeMkcol(path, options)) {
          return false;
        }
      }
      await this._mkcol();
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
  public abstract _mkcol(): Promise<void>;
  public abstract _rmdir(): Promise<void>;

  protected async _checkDirectory() {
    if (!this.fs.supportDirectory) {
      return;
    }

    await this.fs.head(this.path, {
      type: EntryType.Directory,
      errors: undefined,
    });
  }

  protected async _items(options?: ListOptions): Promise<Item[]> {
    try {
      options = { ...options };
      const path = this.path;

      await this._checkDirectory();

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
      return [];
    }
  }
}
