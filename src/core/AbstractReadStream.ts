import { AbstractFileSystemObject } from "./AbstractFileSystemObject";
import { AbstractStream } from "./AbstractStream";
import { OpenOptions, ReadStream, WriteStream } from "./core";

export abstract class AbstractReadStream
  extends AbstractStream
  implements ReadStream
{
  private afterGet?: (path: string) => Promise<void>;

  protected handled = false;

  constructor(
    fso: AbstractFileSystemObject,
    protected readonly options: OpenOptions
  ) {
    super(fso, options);
    this.afterGet = fso.fs.options.hook?.afterGet;
  }

  public async close(): Promise<void> {
    await this._close();
    if (!this.options.ignoreHook && this.afterGet) {
      this.afterGet(this.fso.path);
    }
  }

  public async pipe(ws: WriteStream): Promise<void> {
    let buffer: any;
    while ((buffer = await this.read()) != null) {
      await ws.write(buffer);
    }
  }

  /**
   * Asynchronously reads data from the file.
   * The `File` must have been opened for reading.
   */
  public async read(size?: number): Promise<ArrayBuffer | Uint8Array | null> {
    const buffer = await this._read(size);
    this.handled = true;
    return buffer;
  }

  public abstract _close(): Promise<void>;
  public abstract _read(
    size?: number
  ): Promise<ArrayBuffer | Uint8Array | null>;
}
