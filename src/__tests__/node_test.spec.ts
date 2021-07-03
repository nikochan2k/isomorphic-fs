import { rmdirSync } from "fs";
import { tmpdir } from "os";
import { normalize } from "path";
import { FileSystem, SeekOrigin } from "../core";
import { NotFoundError } from "../errors";
import "../index";
import { toBuffer } from "../node/buffer";
import { NodeFileSystem } from "../node/NodeFileSystem";
import { toText } from "../node/text";
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

test("add empty file", async () => {
  const file = await fs.openFile("/empty.txt");
  try {
    await file.getStats();
    fail("Found file: " + file.path);
  } catch (e) {
    expect(e).toBeInstanceOf(NotFoundError);
  }
  const buffer = toBuffer("");
  const ws = file.openWriteStream();
  await ws.write(buffer);
  await ws.close();
  const stats = await file.getStats();
  expect(stats.size).toBe(0);
});

test("add text file", async () => {
  const file = await fs.openFile("/test.txt");
  try {
    await file.getStats();
    fail("Found file: " + file.path);
  } catch (e) {
    expect(e).toBeInstanceOf(NotFoundError);
  }
  const buffer = toBuffer("test");
  const ws = file.openWriteStream();
  await ws.write(buffer);
  await ws.close();
  const stats = await file.getStats();
  expect(stats.size).toBe(4);
});

test("read text file", async () => {
  const file = await fs.openFile("/test.txt");
  const rs = file.openReadStream();
  const buffer = await rs.read();
  expect(buffer.byteLength).toBe(4);
  const text = toText(buffer);
  expect(text).toBe("test");
});

test("continuous read and write", async () => {
  const file = await fs.openFile("/cont.txt");
  const ws = file.openWriteStream();
  await ws.write(toBuffer("大谷"));
  await ws.write(toBuffer("翔平"));
  await ws.close();
  const rs = file.openReadStream();
  await rs.seek(6, SeekOrigin.Begin);
  const text = toText(await rs.read());
  expect(text).toBe("翔平");
});
