import { getSize } from "univ-conv";
import { AbstractFile } from "./AbstractFile";
import { AbstractStream } from "./AbstractStream";
import {
  OpenReadOptions,
  ReadStream,
  Ret,
  Source,
  SourceType,
  WriteStream,
} from "./core";

export abstract class AbstractReadStream
  extends AbstractStream
  implements ReadStream
{
  private afterGet?: (path: string) => Promise<void>;

  protected fileSize?: number;
  protected handled = false;

  constructor(
    file: AbstractFile,
    protected override readonly options: OpenReadOptions
  ) {
    super(file, options);
    if (!options.sourceType) {
      options.sourceType = this.getDefaultSourceType();
    }
    this.afterGet = file.fs.options.hook?.afterGet;
  }

  public async close(): Promise<void> {
    await this._close();
    this.position = 0;
    if (!this.options.ignoreHook && this.afterGet) {
      this.afterGet(this.file.path);
    }
  }

  public async pipe(ws: WriteStream): Promise<Ret<number>> {
    let written: number = 0;
    while (true) {
      const [chunk, eR] = await this.read();
      if (eR) return [written as never, eR];
      if (!chunk) break;
      const [size, eW] = await ws.write(chunk);
      if (eW) return [written as never, eW];
      written += size;
    }
    return [written, undefined as never];
  }

  /**
   * Asynchronously reads data from the file.
   * The `File` must have been opened for reading.
   */
  public async read(size?: number): Promise<Ret<Source | null>> {
    const af = this.file;
    const converter = this.converter;
    const souceType = this.options.sourceType as SourceType;
    let ret: Ret<Source | null>;
    let pos = 0;
    if (size == null || size <= this.bufferSize) {
      const [chunk, e] = (ret = await this._read(size));
      if (e) return ret;
      if (chunk) {
        pos = getSize(chunk);
        ret[0] = await af._convert(chunk, souceType, converter);
      }
    } else {
      const chunks: Source[] = [];
      const [fileSize, e] = await this._getFileSize();
      if (e) return [undefined as never, e];
      const max = Math.min(size, fileSize);
      do {
        let next = pos + this.bufferSize;
        if (max < next) next = max;
        let chunkSize = next - pos;
        const [chunk, e] = (ret = await this._read(chunkSize));
        if (e) return ret;
        if (!chunk) break;
        pos += getSize(chunk);
        const converted = await af._convert(chunk, souceType, converter);
        chunks.push(converted);
      } while (pos < max);
      if (0 < chunks.length) {
        ret[0] = await af._joinChunks(chunks, pos, souceType);
      }
    }
    this.position += pos;
    this.handled = true;
    return ret;
  }

  public abstract _close(): Promise<void>;
  public abstract _read(size?: number): Promise<Ret<Source | null>>;

  protected async _getFileSize(): Promise<Ret<number>> {
    if (this.fileSize) return [this.fileSize, undefined as never];
    const [stats, e] = await this.file.head({ ignoreHook: true });
    if (e) return [undefined as never, e];
    const fileSize = stats.size as number;
    this.fileSize = fileSize;
    return [fileSize, undefined as never];
  }

  protected abstract getDefaultSourceType(): SourceType;
}
