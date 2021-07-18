import "../index";
import { rmSync } from "fs";
import { tmpdir } from "os";
import { normalize } from "path";
import { NodeFileSystem } from "../node/NodeFileSystem";
import { DIR_SEPARATOR } from "../util/path";
import * as basic from "./basic";

const tempDir = tmpdir();
let rootDir = `${tempDir}${DIR_SEPARATOR}isomorphic-fs-test`;
rootDir = normalize(rootDir);

try {
  rmSync(rootDir, { recursive: true });
} catch {}

const fs = new NodeFileSystem(rootDir);

basic.testAll(fs, null, async () => {
  rmSync(rootDir, { recursive: true });
});
