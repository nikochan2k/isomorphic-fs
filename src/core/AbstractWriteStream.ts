import { AbstractFileSystemObject } from "./AbstractFileSystemObject";
import { AbstractStream } from "./AbstractStream";
import { OpenWriteOptions, WriteStream } from "./common";

export abstract class AbstractWriteStream
  extends AbstractStream
  implements WriteStream
{
  private afterPost?: (path: string) => Promise<void>;
  private afterPut?: (path: string) => Promise<void>;

  protected handled = false;

  constructor(
    fso: AbstractFileSystemObject,
    protected readonly options: OpenWriteOptions
  ) {
    super(fso, options);
    const hook = fso.fs.options.hook;
    this.afterPost = hook?.afterPost;
    this.afterPut = hook?.afterPut;
  }

  public async close(): Promise<void> {
    await this._close();
    if (!this.handled) {
      return;
    }
    if (!this.options.ignoreHook && this.afterPost && this.options.create) {
      await this.afterPost(this.fso.path);
    } else if (
      !this.options.ignoreHook &&
      this.afterPut &&
      !this.options.create
    ) {
      await this.afterPut(this.fso.path);
    }
  }

  public async setLength(len: number): Promise<void> {
    await this.setLength(len);
    this.handled = true;
  }

  /**
   * Asynchronously reads data from the file.
   * The `File` must have been opened for reading.
   */
  public async write(buffer: ArrayBuffer | Uint8Array): Promise<void> {
    await this._write(buffer);
    this.handled = true;
  }

  public abstract _close(): Promise<void>;
  public abstract _setLength(len: number): Promise<void>;
  public abstract _write(buffer: ArrayBuffer | Uint8Array): Promise<void>;
}
