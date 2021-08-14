import { AbstractFile } from "./AbstractFile";
import { AbstractStream } from "./AbstractStream";
import { OpenWriteOptions, WriteStream } from "./core";

export abstract class AbstractWriteStream
  extends AbstractStream
  implements WriteStream
{
  private afterPost?: (path: string) => Promise<void>;
  private afterPut?: (path: string) => Promise<void>;

  protected changed = false;

  constructor(
    file: AbstractFile,
    protected readonly options: OpenWriteOptions
  ) {
    super(file, options);
    const hook = file.fs.options.hook;
    this.afterPost = hook?.afterPost;
    this.afterPut = hook?.afterPut;
  }

  public async close(): Promise<void> {
    await this._close();
    this.position = 0;
    if (!this.changed) {
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

  public async truncate(size: number): Promise<void> {
    await this._truncate(size);
    if (size < this.position) {
      this.position = size;
    }
    this.changed = true;
  }

  /**
   * Asynchronously reads data from the file.
   * The `File` must have been opened for reading.
   */
  public async write(buffer: ArrayBuffer | Uint8Array): Promise<void> {
    await this._write(buffer);
    this.position += buffer.byteLength;
    this.changed = true;
  }

  public abstract _close(): Promise<void>;
  public abstract _truncate(size: number): Promise<void>;
  public abstract _write(buffer: ArrayBuffer | Uint8Array): Promise<void>;
}
