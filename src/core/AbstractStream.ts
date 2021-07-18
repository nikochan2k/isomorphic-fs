import { AbstractFileSystemObject } from "./AbstractFileSystemObject";
import { DEFAULT_BUFFER_SIZE, OpenOptions, SeekOrigin, Stream } from "./core";

export abstract class AbstractStream implements Stream {
  protected readonly bufferSize = DEFAULT_BUFFER_SIZE;

  constructor(protected fso: AbstractFileSystemObject, options: OpenOptions) {
    if (options.bufferSize) {
      this.bufferSize = options.bufferSize;
    }
  }

  public abstract close(): Promise<void>;
  public abstract seek(offset: number, origin: SeekOrigin): Promise<void>;
}
