import * as fs from "fs";
import { AbstractFile } from "../core/AbstractFile";
import { AbstractFileSystem } from "../core/AbstractFileSystem";
import { AbstractReadStream } from "../core/AbstractReadStream";
import { AbstractWriteStream } from "../core/AbstractWriteStream";
import { DeleteOptions, OpenWriteOptions } from "../core/core";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";
import { NodeReadStream } from "./NodeReadStream";
import { NodeWriteStream } from "./NodeWriteStream";

export class NodeFile extends AbstractFile {
  public override toString = this.getFullPath;

  constructor(fs: AbstractFileSystem, path: string) {
    super(fs, path);
  }

  public _delete(options: DeleteOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.rm(
        this.getFullPath(),
        { force: options.force, recursive: options.recursive },
        (err) => {
          if (err) {
            reject(convertError(this.fs.repository, this.path, err, true));
          } else {
            resolve();
          }
        }
      );
    });
  }

  public async _createReadStream(
    options: OpenWriteOptions
  ): Promise<AbstractReadStream> {
    return new NodeReadStream(this, options);
  }

  public async _createWriteStream(
    options: OpenWriteOptions
  ): Promise<AbstractWriteStream> {
    return new NodeWriteStream(this, options);
  }

  private getFullPath() {
    return joinPaths(this.fs.repository, this.path);
  }
}
