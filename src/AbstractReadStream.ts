import { getSize } from "univ-conv";
import { AbstractFile } from "./AbstractFile";
import { AbstractStream } from "./AbstractStream";
import {
  OpenReadOptions,
  ReadStream,
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

  constructor(file: AbstractFile, protected readonly options: OpenReadOptions) {
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
  public async read(size?: number): Promise<Source | null> {
    const file = this.file;
    const converter = this.converter;
    const souceType = this.options.sourceType as SourceType;
    let result: Source | null = null;
    let pos = 0;
    if (size == null || size <= this.bufferSize) {
      const chunk = await this._read(size);
      if (chunk) {
        pos = getSize(chunk);
        result = await file._convert(converter, chunk, souceType);
      }
    } else {
      const chunks: Source[] = [];
      const fileSize = await this._getFileSize();
      const max = Math.min(size, fileSize);
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
        pos += getSize(chunk);
        const converted = await file._convert(converter, chunk, souceType);
        chunks.push(converted);
      } while (pos < max);
      if (0 < chunks.length) {
        result = await file._joinChunks(chunks, pos, souceType);
      }
    }
    this.position += pos;
    this.handled = true;
    return result;
  }

  public abstract _close(): Promise<void>;
  public abstract _read(size?: number): Promise<Source | null>;

  protected async _getFileSize() {
    if (this.fileSize) {
      return this.fileSize;
    }
    const stats = await this.file.head({ ignoreHook: true });
    const fileSize = stats.size as number;
    this.fileSize = fileSize;
    return fileSize;
  }

  protected abstract getDefaultSourceType(): SourceType;
}
