import * as fs from "fs";
import {
  Directory,
  FileSystem,
  MakeDirectoryOptions,
  Props,
  RmOptions,
  Stats,
  URLType,
} from "../core";
import { joinPathes } from "../util/path";
import { NodeFileSystemObject } from "./NodeFileSystemObject";

export class NodeDirectory extends Directory {
  private readonly fso: NodeFileSystemObject;

  constructor(fs: FileSystem, path: string) {
    super(fs, path);
    this.fso = new NodeFileSystemObject(fs, path);
  }

  public doGetStats(): Promise<Stats> {
    return this.fso.doGetStats();
  }

  public doRm(options?: RmOptions): Promise<void> {
    return this.fso.doRm(options);
  }

  public doSetProps(props: Props): Promise<void> {
    return this.fso.doSetProps(props);
  }

  public getURL(_urlType?: URLType): Promise<string> {
    return this.fso.getURL();
  }

  public mkdir(options?: MakeDirectoryOptions): Promise<void> {
    const recursive = options?.recursive || true;
    return new Promise<void>((resolve, reject) => {
      fs.mkdir(this.fso.getFullPath(), { recursive }, (err) => {
        if (err) {
          reject(this.fso.convertError(err, true));
        } else {
          resolve();
        }
      });
    });
  }

  public readdir(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(this.fso.getFullPath(), (err, names) => {
        if (err) {
          reject(this.fso.convertError(err, false));
        } else {
          resolve(names.map((name) => joinPathes(this.path, name)));
        }
      });
    });
  }
}
