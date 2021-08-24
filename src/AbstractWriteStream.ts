import { AbstractFile } from "./AbstractFile";
import { AbstractStream } from "./AbstractStream";
import { OpenWriteOptions, Ret, Source, WriteStream } from "./core";

export abstract class AbstractWriteStream
  extends AbstractStream
  implements WriteStream
{
  private afterPost?: (path: string) => Promise<void>;
  private afterPut?: (path: string) => Promise<void>;

  protected changed = false;

  constructor(
    file: AbstractFile,
    protected override readonly options: OpenWriteOptions
  ) {
    super(file, options);
    const hook = file.fs.options.hook;
    this.afterPost = hook?.afterPost;
    this.afterPut = hook?.afterPut;
  }

  public async close(): Promise<void> {
    await this._close();
    this.position = 0;
    if (!this.changed) return;
    if (!this.options.ignoreHook && this.afterPost && this.options.create) {
      await this.afterPost(this.file.path);
    } else if (
      !this.options.ignoreHook &&
      this.afterPut &&
      !this.options.create
    ) {
      await this.afterPut(this.file.path);
    }
  }

  public async truncate(size: number): Promise<Ret<number>> {
    const ret = await this._truncate(size);
    const [truncated, e] = ret;
    if (e) return ret;
    if (truncated < this.position) this.position = truncated;
    this.changed = true;
    return ret;
  }

  /**
   * Asynchronously reads data from the file.
   * The `File` must have been opened for reading.
   */
  public async write(src: Source): Promise<Ret<number>> {
    const ret = await this._write(src);
    const [written, e] = ret;
    if (e) return ret;
    this.position += written;
    this.changed = true;
    return ret;
  }

  public abstract _close(): Promise<void>;
  public abstract _truncate(size: number): Promise<Ret<number>>;
  public abstract _write(value: Source): Promise<Ret<number>>;
}
