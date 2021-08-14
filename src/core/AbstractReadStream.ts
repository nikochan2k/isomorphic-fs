import { AbstractFile } from "./AbstractFile";
import { AbstractStream } from "./AbstractStream";
import { OpenOptions, ReadStream, WriteStream } from "./core";

export abstract class AbstractReadStream
  extends AbstractStream
  implements ReadStream
{
  private afterGet?: (path: string) => Promise<void>;

  protected handled = false;

  constructor(file: AbstractFile, protected readonly options: OpenOptions) {
    super(file, options);
    this.afterGet = file.fs.options.hook?.afterGet;
  }

  public async close(): Promise<void> {
    await this._close();
    this.position = 0;
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
  public async read(size?: number): Promise<ArrayBuffer | null> {
    let buffer: ArrayBuffer | null;
    if (size == null || size <= this.bufferSize) {
      buffer = await this._read(size);
      if (buffer) {
        this.position += buffer.byteLength;
      }
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
        const chunk = await this._read(chunkSize);
        if (!chunk) {
          break;
        }
        u8.set(chunk, pos);
        pos += chunkSize;
      } while (pos < max);
      this.position += pos;
      if (pos === max) {
        buffer = buf;
      } else {
        buffer = buf.slice(0, pos);
      }
    }

    this.handled = true;
    return buffer;
  }

  public abstract _close(): Promise<void>;
  public abstract _read(size?: number): Promise<Uint8Array | null>;
}
