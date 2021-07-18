import { createHash } from "crypto";
import * as fs from "fs";
import { AbstractFile } from "../core/AbstractFile";
import { AbstractFileSystem } from "../core/AbstractFileSystem";
import { AbstractReadStream } from "../core/AbstractReadStream";
import { AbstractWriteStream } from "../core/AbstractWriteStream";
import { DeleteOptions, OpenOptions, OpenWriteOptions } from "../core/core";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";
import { NodeReadStream } from "./NodeReadStream";
import { NodeWriteStream } from "./NodeWriteStream";

export class NodeFile extends AbstractFile {
  public override toString = this.getFullPath;

  constructor(fs: AbstractFileSystem, path: string) {
    super(fs, path);
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

  public override hash(options: OpenOptions = {}): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const repository = this.fs.repository;
      const path = this.path;
      if (!options.ignoreHook) {
        const beforeGet = this.fs.options.hook?.beforeGet;
        if (beforeGet) {
          await this.beforeGet(path, options);
        }
      }
      const hash = createHash("sha256");
      try {
        var input = fs.createReadStream(this.getFullPath(), {
          highWaterMark: options.bufferSize,
        });
      } catch (e) {
        throw convertError(repository, path, e, false);
      }
      const onData = (data: any) => {
        hash.update(data);
      };
      input.on("data", onData);
      const onEnd = async () => {
        if (!options.ignoreHook) {
          const afterGet = this.fs.options.hook?.afterGet;
          if (afterGet) {
            await afterGet(this.path);
          }
        }
        input.off("data", onData);
        input.off("end", onEnd);
        resolve(hash.digest("hex"));
      };
      input.on("end", onEnd);
      const onError = (err: any) => {
        input.off("data", onData);
        input.off("error", onError);
        reject(convertError(repository, path, err, false));
      };
      input.on("error", onError);
    });
  }

  private getFullPath() {
    return joinPaths(this.fs.repository, this.path);
  }
}
