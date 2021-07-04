import { createHash } from "crypto";
import * as fs from "fs";
import {
  File,
  FileSystem,
  OpenOptions,
  Props,
  ReadStream,
  RmOptions,
  Stats,
  URLType,
  WriteStream,
} from "../core";
import { NodeFileSystemObject } from "./NodeFileSystemObject";
import { NodeReadStream } from "./NodeReadStream";
import { NodeWriteStream } from "./NodeWriteStream";

export class NodeFile extends File {
  private readonly fso: NodeFileSystemObject;

  constructor(fs: FileSystem, path: string) {
    super(fs, path);
    this.fso = new NodeFileSystemObject(fs, path);
  }

  public doGetStats(): Promise<Stats> {
    return this.fso.doGetStats();
  }

  public doOpenReadStream(options?: OpenOptions): ReadStream {
    return new NodeReadStream(this.fso, options);
  }

  public doOpenWriteStream(options?: OpenOptions): WriteStream {
    return new NodeWriteStream(this.fso, options);
  }

  public doRm(options?: RmOptions): Promise<void> {
    return this.fso.doRm(options);
  }

  public doSetProps(props: Props): Promise<void> {
    return this.fso.doSetProps(props);
  }

  public override getHash(): Promise<string> {
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
        reject(this.fso.convertError(err, false));
      });
    });
  }

  public getURL(_urlType?: URLType): Promise<string> {
    return this.fso.getURL();
  }
}
