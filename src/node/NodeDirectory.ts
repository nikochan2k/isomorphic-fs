import * as fs from "fs";
import { AbstractDirectory } from "../core/AbstractDirectory";
import { AbstractFileSystem } from "../core/AbstractFileSystem";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";

export class NodeDirectory extends AbstractDirectory {
  public override toString = this.getFullPath;

  constructor(fs: AbstractFileSystem, path: string) {
    super(fs, path);
  }

  public _list(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(this.getFullPath(), (err, names) => {
        if (err) {
          reject(convertError(this.fs.repository, this.path, err, false));
        } else {
          resolve(names.map((name) => joinPaths(this.path, name)));
        }
      });
    });
  }

  public _mkcol(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.mkdir(this.getFullPath(), { recursive: true }, (err) => {
        if (err) {
          reject(convertError(this.fs.repository, this.path, err, true));
        } else {
          resolve();
        }
      });
    });
  }

  public _rmdir(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.rmdir(this.getFullPath(), { recursive: false }, (err) => {
        if (err) {
          reject(convertError(this.fs.repository, this.path, err, true));
        } else {
          resolve();
        }
      });
    });
  }

  public _rmdirRecursively(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.rmdir(this.getFullPath(), { recursive: true }, (err) => {
        if (err) {
          reject(convertError(this.fs.repository, this.path, err, true));
        } else {
          resolve();
        }
      });
    });
  }

  private getFullPath() {
    return joinPaths(this.fs.repository, this.path);
  }
}
