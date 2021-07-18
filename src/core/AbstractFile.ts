import { createHash } from "sha256-uint8array";
import { toUint8Array } from "../util/buffer";
import { toHex } from "../util/misc";
import { AbstractDirectory } from "./AbstractDirectory";
import { AbstractFileSystem } from "./AbstractFileSystem";
import { AbstractFileSystemObject } from "./AbstractFileSystemObject";
import { AbstractReadStream } from "./AbstractReadStream";
import { AbstractWriteStream } from "./AbstractWriteStream";
import {
  File,
  OpenOptions,
  OpenWriteOptions,
  ReadStream,
  WriteStream,
  XmitError,
  XmitOptions,
} from "./core";
import {
  InvalidModificationError,
  NotFoundError,
  PathExistsError,
} from "./errors";

export abstract class AbstractFile
  extends AbstractFileSystemObject
  implements File
{
  private beforeGet?: (
    path: string,
    options: OpenOptions
  ) => Promise<ReadStream | null>;
  private beforePost?: (
    path: string,
    options: OpenWriteOptions
  ) => Promise<WriteStream | null>;
  private beforePut?: (
    path: string,
    options: OpenWriteOptions
  ) => Promise<WriteStream | null>;

  constructor(fs: AbstractFileSystem, path: string) {
    super(fs, path);
    const hook = fs.options?.hook;
    if (hook) {
      this.beforeGet = hook.beforeGet;
      this.beforePost = hook.beforePost;
      this.beforePut = hook.beforePut;
    }
  }

  public async _xmit(
    toFso: AbstractFileSystemObject,
    copyErrors: XmitError[],
    options: XmitOptions
  ): Promise<void> {
    await this.head(); // check if this directory exists
    if (toFso instanceof AbstractDirectory) {
      throw new InvalidModificationError(
        toFso.fs.repository,
        toFso.path,
        `Cannot copy a file "${this}" to a directory "${toFso}"`
      );
    }
    const to = toFso as AbstractFile;
    if (!options.force) {
      try {
        await to.head();
        throw new PathExistsError(to.fs.repository, to.path);
      } catch (e) {
        if (!(e instanceof NotFoundError)) {
          throw e;
        }
      }
    }

    const rs = await this.openReadStream({ bufferSize: options.bufferSize });
    try {
      let create: boolean;
      try {
        await to.stat();
        create = false;
      } catch (e) {
        if (e instanceof NotFoundError) {
          create = true;
        } else {
          throw e;
        }
      }
      const ws = await to.openWriteStream({
        append: false,
        create,
        bufferSize: options.bufferSize,
      });
      try {
        let buffer: any;
        while ((buffer = await rs.read()) != null) {
          await ws.write(buffer);
        }
      } finally {
        await ws.close();
      }
    } finally {
      await rs.close();
    }

    if (options.move) {
      try {
        await this.delete();
      } catch (error) {
        copyErrors.push({ from: this, to, error });
      }
    }
  }

  public async hash(bufferSize?: number): Promise<string> {
    const rs = await this.openReadStream({ bufferSize });
    try {
      const hash = createHash();
      let buffer: ArrayBuffer | Uint8Array | null;
      while ((buffer = await rs.read()) != null) {
        hash.update(toUint8Array(buffer));
      }

      return toHex(hash.digest());
    } finally {
      rs.close();
    }
  }

  public async openReadStream(options: OpenOptions = {}): Promise<ReadStream> {
    let rs: ReadStream | null | undefined;
    if (!options.ignoreHook && this.beforeGet) {
      rs = await this.beforeGet(this.path, options);
    }
    if (!rs) {
      rs = await this._openReadStream(options);
    }
    return rs as ReadStream;
  }

  public async openWriteStream(
    options: OpenWriteOptions = { append: false }
  ): Promise<WriteStream> {
    let ws: WriteStream | null | undefined;
    try {
      await this.stat();
      if (options.create === true) {
        throw new PathExistsError(this.fs.repository, this.path);
      }
      options.create = false;
      if (!options.ignoreHook && this.beforePut) {
        ws = await this.beforePut(this.path, options);
      }
    } catch (e) {
      if (e instanceof NotFoundError) {
        if (options.create === false) {
          throw e;
        }
        options.create = true;
        if (!options.ignoreHook && this.beforePost) {
          ws = await this.beforePost(this.path, options);
        }
      } else {
        throw e;
      }
    }
    if (!ws) {
      ws = await this._openWriteStream(options);
    }
    return ws as WriteStream;
  }

  public abstract _openReadStream(
    options: OpenOptions
  ): Promise<AbstractReadStream>;
  public abstract _openWriteStream(
    options: OpenOptions
  ): Promise<AbstractWriteStream>;
}
