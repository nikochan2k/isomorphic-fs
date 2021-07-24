import { EMPTY_ARRAY_BUFFER, toUint8Array } from "../util";
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
  public async read(size?: number): Promise<ArrayBuffer> {
    let buffer: ArrayBuffer | null;
    if (size == null || size <= this.bufferSize) {
      buffer = (await this._read(size)) as ArrayBuffer;
    } else {
      const stats = await this.fso.head();
      const max = Math.min(size, stats.size as number);
      const buf = new ArrayBuffer(max);
      const u8 = new Uint8Array(buf);
      let pos = 0;
      do {
        let next = pos + this.bufferSize;
        if (max < next) {
          next = max;
        }
        let chunkSize = next - pos;
        const b = await this._read(chunkSize);
        const chunk = toUint8Array(b || EMPTY_ARRAY_BUFFER);
        u8.set(chunk, pos);
        pos += chunkSize;
      } while (pos < max);
      buffer = buf;
    }
    this.handled = true;
    return buffer;
  }

  public abstract _close(): Promise<void>;
  public abstract _read(size?: number): Promise<ArrayBuffer | null>;
}
