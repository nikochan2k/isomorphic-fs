import { createHash } from "crypto";
import * as fs from "fs";
import {
  File,
  FileSystem,
  OpenWriteOptions,
  Props,
  ReadStream,
  URLType,
  WriteStream,
} from "../core";
import { convertError } from "./NodeFileSystem";
import { NodeFileSystemObject } from "./NodeFileSystemObject";
import { NodeReadStream } from "./NodeReadStream";
import { NodeWriteStream } from "./NodeWriteStream";

export class NodeFile extends File {
  private readonly fso: NodeFileSystemObject;

  constructor(fs: FileSystem, path: string) {
    super(fs, path);
    this.fso = new NodeFileSystemObject(fs, path);
  }

  public async _openReadStream(options: OpenWriteOptions): Promise<ReadStream> {
    return new NodeReadStream(this.fso, options);
  }

  public async _openWriteStream(
    options: OpenWriteOptions
  ): Promise<WriteStream> {
    return new NodeWriteStream(this.fso, options);
  }

  public _patch(props: Props): Promise<void> {
    return this.fso._patch(props);
  }

  public override hash(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const hash = createHash("sha256");
      const input = fs.createReadStream(this.fso.getFullPath());
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

  public toURL(_urlType?: URLType): Promise<string> {
    return this.fso.toURL();
  }
}
