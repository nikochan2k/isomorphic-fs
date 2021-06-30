import { rmdirSync } from "fs";
import { tmpdir } from "os";
import { normalize } from "path";
import { FileSystem } from "../core";
import { NotFoundError } from "../errors";
import { NodeFileSystem } from "../node/NodeFileSystem";
import { DIR_SEPARATOR } from "../util/path";

const tempDir = tmpdir();
let rootDir = `${tempDir}${DIR_SEPARATOR}isomorphic-fs-test`;
rootDir = normalize(rootDir);

try {
  rmdirSync(rootDir, { recursive: true });
} catch {}

let fs: FileSystem;
beforeAll(async () => {
  fs = new NodeFileSystem(rootDir);
});

test("readdir", async () => {
  const dir = await fs.openDirectory("/");
  try {
    await dir.getStats();
    fail("Found directory: " + dir.path);
  } catch (e) {
    expect(e).toBeInstanceOf(NotFoundError);
  }
  await dir.mkdir();
  const pathes = await dir.readdir();
  expect(pathes.length).toBe(0);
});

/*
test("add empty file", async () => {
  const file = await fs.openWrite("/empty.txt");
  file.write()
  const dir = await fs.openDirectory("/");
  try {
    await dir.getStats();
    fail("Found directory: " + dir.path);
  } catch (e) {
    expect(e).toBeInstanceOf(NotFoundError);
  }
  await dir.mkdir();
  const pathes = await dir.readdir();
  expect(pathes.length).toBe(0);
});
*/
