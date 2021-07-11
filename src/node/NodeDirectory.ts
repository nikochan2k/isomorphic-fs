import * as fs from "fs";
import {
  Directory,
  FileSystem,
  MakeDirectoryOptions,
  Props,
  DeleteOptions,
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

  public _copy(toPath: string): Promise<void> {
    return this.fso._copy(toPath);
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
          reject(this.fso.convertError(err, false));
        } else {
          resolve(names.map((name) => joinPathes(this.path, name)));
        }
      });
    });
  }

  public _mkcol(options?: MakeDirectoryOptions): Promise<void> {
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

  public _move(toPath: string): Promise<void> {
    return this.fso._move(toPath);
  }

  public _patch(props: Props): Promise<void> {
    return this.fso._patch(props);
  }

  public toURL(_urlType?: URLType): Promise<string> {
    return this.fso.toURL();
  }
}
