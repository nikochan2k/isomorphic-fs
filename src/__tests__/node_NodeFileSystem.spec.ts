import { fail } from "assert/strict";
import { rmdirSync } from "fs";
import { tmpdir } from "os";
import { normalize } from "path";
import { NotFoundError } from "../errors";
import { NodeFileSystem } from "../node/NodeFileSystem";
import { DIR_SEPARATOR } from "../util/path";

const tempDir = tmpdir();
let rootDir = `${tempDir}${DIR_SEPARATOR}isomorphic-fs-test`;
rootDir = normalize(rootDir);

try {
  rmdirSync(rootDir, { recursive: true });
} catch {}

test("util/NodeFileSystem.ts#readdir", async () => {
  const fs = new NodeFileSystem(rootDir);
  const dir = await fs.openDirectory("/");
  try {
    dir.getStats();
    fail("Found directory: " + dir.path);
  } catch (e) {
    expect(e).toBeInstanceOf(NotFoundError);
  }
  await dir.mkdir();
  const pathes = await dir.readdir();
  expect(pathes.length).toBe(0);
});
