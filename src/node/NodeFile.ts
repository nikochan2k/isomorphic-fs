import { createHash } from "crypto";
import * as fs from "fs";
import { OpenWriteOptions } from "../core/common";
import { File, FileSystem, ReadStream, WriteStream } from "../core/core";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";
import { NodeReadStream } from "./NodeReadStream";
import { NodeWriteStream } from "./NodeWriteStream";

export class NodeFile extends File {
  public override toString = this.getFullPath;

  constructor(fs: FileSystem, path: string) {
    super(fs, path);
  }

  public async _openReadStream(options: OpenWriteOptions): Promise<ReadStream> {
    return new NodeReadStream(this, options);
  }

  public async _openWriteStream(
    options: OpenWriteOptions
  ): Promise<WriteStream> {
    return new NodeWriteStream(this, options);
  }

  public override hash(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const hash = createHash("sha256");
      const input = fs.createReadStream(this.getFullPath());
      input.on("data", (data) => {
        hash.update(data);
      });
      input.on("end", () => {
        resolve(hash.digest("hex"));
      });
      input.on("error", (err) => {
        reject(convertError(this.fs.repository, this.path, err, false));
      });
    });
  }

  private getFullPath() {
    return joinPaths(this.fs.repository, this.path);
  }
}
