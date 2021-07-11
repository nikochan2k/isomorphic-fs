import * as fs from "fs";
import {
  DeleteOptions,
  Directory,
  FileSystem,
  MakeDirectoryOptions,
  Props,
  Stats,
  URLType,
} from "../core";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";
import { NodeFileSystemObject } from "./NodeFileSystemObject";

export class NodeDirectory extends Directory {
  private readonly fso: NodeFileSystemObject;

  constructor(fs: FileSystem, path: string) {
    super(fs, path);
    this.fso = new NodeFileSystemObject(fs, path);
  }

  public _delete(options?: DeleteOptions): Promise<void> {
    return this.fso._delete(options);
  }

  public _head(): Promise<Stats> {
    return this.fso._head();
  }

  public _list(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(this.fso.getFullPath(), (err, names) => {
        if (err) {
          reject(convertError(this.fs, this.path, err, false));
        } else {
          resolve(names.map((name) => joinPaths(this.path, name)));
        }
      });
    });
  }

  public _mkcol(options?: MakeDirectoryOptions): Promise<void> {
    const recursive = options?.recursive || true;
    return new Promise<void>((resolve, reject) => {
      fs.mkdir(this.fso.getFullPath(), { recursive }, (err) => {
        if (err) {
          reject(convertError(this.fs, this.path, err, true));
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
