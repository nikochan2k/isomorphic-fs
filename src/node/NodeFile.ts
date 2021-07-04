import { createHash } from "crypto";
import * as fs from "fs";
import {
  File,
  FileSystem,
  OpenOptions,
  Props,
  ReadStream,
  DeleteOptions,
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

  public doCopy(toPath: string): Promise<void> {
    return this.fso.doCopy(toPath);
  }

  public doDelete(options?: DeleteOptions): Promise<void> {
    return this.fso.doDelete(options);
  }

  public doHead(): Promise<Stats> {
    return this.fso.doHead();
  }

  public doMove(toPath: string): Promise<void> {
    return this.fso.doMove(toPath);
  }

  public async doOpenReadStream(options?: OpenOptions): Promise<ReadStream> {
    return new NodeReadStream(this.fso, options);
  }

  public async doOpenWriteStream(options?: OpenOptions): Promise<WriteStream> {
    return new NodeWriteStream(this.fso, options);
  }

  public doPatch(props: Props): Promise<void> {
    return this.fso.doPatch(props);
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
        reject(this.fso.convertError(err, false));
      });
    });
  }

  public toURL(_urlType?: URLType): Promise<string> {
    return this.fso.toURL();
  }
}
