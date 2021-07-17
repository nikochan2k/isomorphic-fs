import * as fs from "fs";
import { Directory, FileSystem, MkcolOptions, Props, URLType } from "../core";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";
import { NodeFileSystemObject } from "./NodeFileSystemObject";

export class NodeDirectory extends Directory {
  private readonly fso: NodeFileSystemObject;

  constructor(fs: FileSystem, path: string) {
    super(fs, path);
    this.fso = new NodeFileSystemObject(fs, path);
  }

  public _list(): Promise<string[]> {
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

  public _mkcol(options?: MkcolOptions): Promise<void> {
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

  public _patch(props: Props): Promise<void> {
    return this.fso._patch(props);
  }

  public toURL(_urlType?: URLType): Promise<string> {
    return this.fso.toURL();
  }
}
