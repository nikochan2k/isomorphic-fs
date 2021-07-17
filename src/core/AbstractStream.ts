import { AbstractFileSystemObject } from "./AbstractFileSystemObject";
import { OpenOptions, SeekOrigin, Stream } from "./core";

export abstract class AbstractStream implements Stream {
  protected readonly bufferSize = 64 * 1024;

  constructor(protected fso: AbstractFileSystemObject, options: OpenOptions) {
    if (options.bufferSize) {
      this.bufferSize = options.bufferSize;
    }
  }

  public abstract close(): Promise<void>;
  public abstract seek(offset: number, origin: SeekOrigin): Promise<void>;
}
