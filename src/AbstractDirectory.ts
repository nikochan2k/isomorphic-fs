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
  ExistsAction,
  NoParentAction,
  Options,
  Stats,
  XmitOptions,
} from "./core";
import {
  FileSystemError,
  isFileSystemError,
  NotFoundError,
  PathExistError,
} from "./errors";
import { getName, joinPaths, normalizePath } from "./util";

export abstract class AbstractDirectory
  extends AbstractEntry
  implements Directory
{
  constructor(fs: AbstractFileSystem, path: string) {
    super(fs, path);
  }

  public async _copy(
    to: Entry,
    options: XmitOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    if (to instanceof AbstractFile) {
      await this._handleTypeMismatchError(
        { message: `"${this.path}" is not a directory` },
        errors
      );
      return false;
    }

    const toDir = to as Directory;
    let result = await toDir.mkcol(options, errors);
    if (!result) {
      return false;
    }

    if (!options.recursive) {
      return true;
    }

    const fromItems = await this._list(options, errors);
    if (!fromItems) {
      return false;
    }

    const fs = this.fs;

    result = true;
    for (const fromItem of fromItems) {
      const fromPath = fromItem.path;
      const fromEntry = await fs.getEntry(
        fromPath,
        {
          type: fromItem.type,
          ignoreHook: options.ignoreHook,
        },
        errors
      );
      const name = getName(fromPath);
      const toPath = joinPaths(toDir.path, name);
      let res: boolean;
      if (fromEntry instanceof AbstractFile) {
        const toEntry = fs.getFile(toPath);
        res = await fromEntry._copy(toEntry, options, errors);
      } else if (fromEntry instanceof AbstractDirectory) {
        const toEntry = fs.getDirectory(toPath);
        res = await fromEntry._copy(toEntry, options, errors);
      } else {
        continue;
      }
      result = res && result;
    }

    return result;
  }

  public async _deleteExisting(
    options: DeleteOptions,
    errors?: FileSystemError[]
  ): Promise<boolean> {
    let result = true;
    if (options.recursive) {
      const children = await this._list(options, errors);
      if (!children) {
        return false;
      }

      for (const child of children) {
        const childEntry = await this.fs.getEntry(
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

    if (result) {
      if (this.path === "/") {
        console.warn("Cannot delete root dir.");
        result = false;
      } else {
        await this._doDelete();
        result = true;
      }
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
    const list = await this._list(options, errors);
    if (!list) {
      return null;
    }
    return list.map((item) => item.path);
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
    if (!this.fs.supportDirectory()) {
      return true;
    }
    if (this.path === "/") {
      console.warn("Root directory has already existed.");
      return false;
    }

    options = { ...this.fs.defaultMkdirOptions, ...options };

    try {
      const result = await this.$mkcol(options);
      await this._afterMkcol(options, result);
      return result;
    } catch (e) {
      const opts = options;
      await this._handleNoModificationAllowedError(
        { e },
        errors,
        async (error) => {
          await this._afterMkcol(opts, false, error);
        }
      );
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

  public abstract _doDelete(): Promise<void>;
  public abstract _doList(): Promise<Item[]>;
  public abstract _doMkcol(): Promise<void>;

  protected async $list(): Promise<Item[]> {
    const list = await this._doList();
    for (const item of list) {
      if (item.path.endsWith("/")) {
        if (!item.type) {
          item.type = EntryType.Directory;
        }
        item.path = normalizePath(item.path);
      }
    }

    return list;
  }

  protected async $mkcol(options: MkcolOptions): Promise<boolean> {
    const parent = this.getParent();
    try {
      await parent.head({
        type: EntryType.Directory,
        ignoreHook: options?.ignoreHook,
      });
    } catch (e) {
      if (isFileSystemError(e) && e.name === NotFoundError.name) {
        if (options.onNoParent === NoParentAction.Error) {
          throw e;
        }
        if (parent.path !== "/") {
          await parent.mkcol(options);
        }
      }
    }

    try {
      await this.head({
        type: EntryType.Directory,
        ignoreHook: options?.ignoreHook,
      });
      if (options.onExists === ExistsAction.Error) {
        throw this._createError(PathExistError.name, {
          message: `"${this.path}" has already existed`,
        });
      }
    } catch (e) {
      if (isFileSystemError(e)) {
        if (e.name !== NotFoundError.name) {
          throw e;
        }
      } else {
        throw e;
      }
    }

    await this._doMkcol();
    return true;
  }

  protected async _afterList(
    options: ListOptions,
    list: Item[] | null,
    error?: FileSystemError
  ) {
    const fs = this.fs;
    const afterList = fs.options.hook?.afterList;
    if (afterList && !options.ignoreHook) {
      await afterList(fs.repository, this.path, options, list, error);
    }
  }

  protected async _afterMkcol(
    options: MkcolOptions,
    result: boolean,
    error?: FileSystemError
  ) {
    const fs = this.fs;
    const afterMkcol = fs.options.hook?.afterMkcol;
    if (afterMkcol && !options.ignoreHook) {
      await afterMkcol(fs.repository, this.path, options, result, error);
    }
  }

  protected async _beforeList(options: ListOptions) {
    const fs = this.fs;
    const beforeList = fs.options.hook?.beforeList;
    if (beforeList && !options.ignoreHook) {
      return beforeList(fs.repository, this.path, options);
    }
    return null;
  }

  protected async _beforeMkcol(options: MkcolOptions) {
    const fs = this.fs;
    const beforeMkcol = fs.options.hook?.beforeMkcol;
    if (beforeMkcol && !options.ignoreHook) {
      return beforeMkcol(fs.repository, this.path, options);
    }
    return null;
  }

  protected async _exists(options: Options): Promise<Stats> {
    return this.head({
      type: EntryType.Directory,
      ignoreHook: options?.ignoreHook,
    });
  }

  protected async _list(
    options: ListOptions,
    errors?: FileSystemError[]
  ): Promise<Item[] | null> {
    try {
      let list = await this._beforeList(options);
      if (!list) {
        list = await this.$list();
      }

      await this._afterList(options, list);
      return list;
    } catch (e) {
      await this._handleNotReadableError({ e }, errors, async (error) => {
        await this._afterList(options, null, error);
      });
      return null;
    }
  }
}
