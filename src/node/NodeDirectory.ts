import * as fs from "fs";
import {
  Directory,
  FileSystem,
  MakeDirectoryOptions,
  RmOptions,
  Stats,
  Times,
  URLType,
} from "../core";
import { NodeFileSystemObject } from "./NodeFileSystemObject";

export class NodeDirectory extends Directory {
  private fso: NodeFileSystemObject;

  constructor(fs: FileSystem, path: string) {
    super(fs, path);
    this.fso = new NodeFileSystemObject(fs, path);
  }

  public getStats(): Promise<Stats> {
    return this.fso.getStats();
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
      fs.readdir(this.fso.getFullPath(), (err, fullPathes) => {
        if (err) {
          reject(this.fso.convertError(err, false));
        } else {
          const pathes: string[] = [];
          const from = this.fs.repository.length;
          for (const fullPath of fullPathes) {
            pathes.push(fullPath.substr(from));
          }
          resolve(pathes);
        }
      });
    });
  }

  public rm(options?: RmOptions): Promise<void> {
    return this.fso.rm(options);
  }

  public setTimes(times: Times): Promise<void> {
    return this.fso.setTimes(times);
  }
}
