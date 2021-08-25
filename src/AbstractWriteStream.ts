import { AbstractFile } from "./AbstractFile";
import { AbstractStream } from "./AbstractStream";
import { ErrorLike, OpenWriteOptions, Ret, Source, WriteStream } from "./core";

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
    const [stats, eStat] = await this.file.stat({
      ignoreHook: this.options.ignoreHook,
    });
    if (eStat) return [undefined as never, eStat];
    const fileSize = stats.size as number;
    if (fileSize < size) {
      size = fileSize;
    }
    const e = await this._truncate(size);
    if (e) return [undefined as never, e];
    if (size < this.position) this.position = size;
    this.changed = true;
    return [size, undefined as never];
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
  public abstract _truncate(size: number): Promise<void | ErrorLike>;
  public abstract _write(value: Source): Promise<Ret<number>>;
}
