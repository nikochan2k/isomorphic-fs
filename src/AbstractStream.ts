import { Converter, validateBufferSize } from "univ-conv";
import { AbstractFile } from "./AbstractFile";
import {
  DEFAULT_BUFFER_SIZE,
  ErrorLike,
  OpenOptions,
  Ret,
  SeekOrigin,
  Stream,
} from "./core";

export abstract class AbstractStream implements Stream {
  protected readonly bufferSize = DEFAULT_BUFFER_SIZE;

  public converter: Converter;
  public position = 0;

  constructor(
    protected file: AbstractFile,
    protected readonly options: OpenOptions
  ) {
    validateBufferSize(options);
    this.converter = new Converter({ bufferSize: options.bufferSize });
  }

  public async seek(offset: number, origin: SeekOrigin): Promise<Ret<number>> {
    const [stats, eHead] = await this.file.head({
      ignoreHook: this.options.ignoreHook,
    });
    if (eHead) return [undefined as never, eHead];
    const size = stats.size as number;

    let start: number | undefined;
    if (origin === SeekOrigin.Begin) {
      start = offset;
    } else if (origin === SeekOrigin.Current) {
      start = this.position + offset;
    } else {
      start = size + offset;
    }

    if (start < 0) {
      start = 0;
    } else if (size < start) {
      start = size;
    }
    this.position = start;

    const eSeek = await this._seek(start);
    if (eSeek) return [undefined as never, eSeek];
    return [this.position, undefined as never];
  }

  public abstract close(): Promise<void>;

  protected abstract _seek(start: number): Promise<void | ErrorLike>;
}
