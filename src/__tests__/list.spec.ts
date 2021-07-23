import "../polyfill";
import { rmdirSync } from "fs";
import { tmpdir } from "os";
import { normalize } from "path";
import { NotFoundError, NotReadableError } from "../core/errors";
import { NodeFileSystem } from "../node/NodeFileSystem";
import { DIR_SEPARATOR } from "../util/path";

const tempDir = tmpdir();
let rootDir = `${tempDir}${DIR_SEPARATOR}isomorphic-fs-test`;
rootDir = normalize(rootDir);
rmdirSync(rootDir, { recursive: true });

const fs = new NodeFileSystem(rootDir);

test("rootdir", async () => {
  const list = await fs.list("/");
  expect(list.length).toBe(0);
});

test("nothing", async () => {
  try {
    await fs.list("/nothing");
    fail("/nothing exists");
  } catch (e) {
    expect(e).toBeInstanceOf(NotFoundError);
  }
});

test("file", async () => {
  await fs.writeAll("/file", Buffer.alloc(1, 0).buffer);
  try {
    await fs.list("/file");
    fail("/nothing exists");
  } catch (e) {
    expect(e).toBeInstanceOf(NotReadableError);
  }
});
