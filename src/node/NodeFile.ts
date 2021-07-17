import { createHash } from "crypto";
import * as fs from "fs";
import { AbstractFile } from "../core/AbstractFile";
import { AbstractFileSystem } from "../core/AbstractFileSystem";
import { AbstractReadStream } from "../core/AbstractReadStream";
import { AbstractWriteStream } from "../core/AbstractWriteStream";
import { OpenWriteOptions } from "../core/common";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";
import { NodeReadStream } from "./NodeReadStream";
import { NodeWriteStream } from "./NodeWriteStream";

export class NodeFile extends AbstractFile {
  public override toString = this.getFullPath;

  constructor(fs: AbstractFileSystem, path: string) {
    super(fs, path);
  }

  public async _openReadStream(
    options: OpenWriteOptions
  ): Promise<AbstractReadStream> {
    return new NodeReadStream(this, options);
  }

  public async _openWriteStream(
    options: OpenWriteOptions
  ): Promise<AbstractWriteStream> {
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
