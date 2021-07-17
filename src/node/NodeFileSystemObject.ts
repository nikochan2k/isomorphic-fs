import * as fs from "fs";
import { pathToFileURL } from "url";
import {
  DeleteOptions,
  FileSystem,
  FileSystemObject,
  Props,
  URLType,
  XmitError,
} from "../core";
import { InvalidStateError } from "../errors";
import { joinPaths } from "../util/path";
import { convertError } from "./NodeFileSystem";

export class NodeFileSystemObject extends FileSystemObject {
  constructor(fs: FileSystem, path: string) {
    super(fs, path);
  }

  public _delete(options?: DeleteOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.rm(
        this.getFullPath(),
        { force: options?.force, recursive: options?.recursive },
        (err) => {
          if (err) {
            reject(convertError(this.fs.repository, this.path, err, true));
          } else {
            resolve();
          }
        }
      );
    });
  }

  public _patch(props: Props): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (typeof props.accessed !== "number") {
        reject(
          new InvalidStateError(
            this.fs.repository,
            this.path,
            "No accessed time"
          )
        );
        return;
      }
      if (typeof props.modified !== "number") {
        reject(
          new InvalidStateError(
            this.fs.repository,
            this.path,
            "No modified time"
          )
        );
        return;
      }
      fs.utimes(this.getFullPath(), props.accessed, props.modified, (err) => {
        if (err) {
          reject(convertError(this.fs.repository, this.path, err, true));
        } else {
          resolve();
        }
      });
    });
  }

  public _xmit(
    _fso: FileSystemObject,
    _move: boolean,
    _copyErrors: XmitError[]
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getFullPath() {
    return joinPaths(this.fs.repository, this.path);
  }

  public override toString = (): string => {
    return this.getFullPath();
  };

  public async toURL(_urlType?: URLType): Promise<string> {
    return pathToFileURL(this.getFullPath()).href;
  }
}
