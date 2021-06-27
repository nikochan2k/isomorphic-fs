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
  private nodeFSO: NodeFileSystemObject;

  constructor(fs: FileSystem, path: string) {
    super(fs, path);
    this.nodeFSO = new NodeFileSystemObject(fs, path);
  }

  public getStats(): Promise<Stats> {
    return this.nodeFSO.getStats();
  }

  public getURL(_urlType?: URLType): Promise<string> {
    return this.nodeFSO.getURL();
  }

  public mkdir(
    path: string,
    options: MakeDirectoryOptions & { recursive: true }
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.mkdir(path, { recursive: options.recursive }, (err) => {
        if (err) {
          reject(this.nodeFSO.convertError(err, true));
        } else {
          resolve();
        }
      });
    });
  }

  public readdir(path: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(path, (err, fullPathes) => {
        if (err) {
          reject(this.nodeFSO.convertError(err, false));
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
    return this.nodeFSO.rm(options);
  }

  public setTimes(times: Times): Promise<void> {
    return this.nodeFSO.setTimes(times);
  }
}
