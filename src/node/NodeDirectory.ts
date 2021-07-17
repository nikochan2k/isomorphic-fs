import * as fs from "fs";
import { Directory, FileSystem, ListOptions, MkcolOptions } from "../core";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";
import { NodeFileSystemObject } from "./NodeFileSystemObject";

export class NodeDirectory extends Directory {
  private readonly fso: NodeFileSystemObject;
  public override toString = () => {
    return this.fso.toString();
  };

  constructor(fs: FileSystem, path: string) {
    super(fs, path);
    this.fso = new NodeFileSystemObject(fs, path);
  }

  public _list(_options: ListOptions): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(this.fso.getFullPath(), (err, names) => {
        if (err) {
          reject(convertError(this.fs.repository, this.path, err, false));
        } else {
          resolve(names.map((name) => joinPaths(this.path, name)));
        }
      });
    });
  }

  public _mkcol(options: MkcolOptions): Promise<void> {
    const recursive = options?.recursive || true;
    return new Promise<void>((resolve, reject) => {
      fs.mkdir(this.fso.getFullPath(), { recursive }, (err) => {
        if (err) {
          reject(convertError(this.fs.repository, this.path, err, true));
        } else {
          resolve();
        }
      });
    });
  }
}
