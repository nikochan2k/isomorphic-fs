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

  public doCopy(toPath: string): Promise<void> {
    return this.fso.doCopy(toPath);
  }

  public doDelete(options?: DeleteOptions): Promise<void> {
    return this.fso.doDelete(options);
  }

  public doHead(): Promise<Stats> {
    return this.fso.doHead();
  }

  public doList(): Promise<string[]> {
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

  public doMkcol(options?: MakeDirectoryOptions): Promise<void> {
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

  public doMove(toPath: string): Promise<void> {
    return this.fso.doMove(toPath);
  }

  public doPatch(props: Props): Promise<void> {
    return this.fso.doPatch(props);
  }

  public toURL(_urlType?: URLType): Promise<string> {
    return this.fso.toURL();
  }
}
