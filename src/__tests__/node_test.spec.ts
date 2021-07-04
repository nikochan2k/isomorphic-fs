import { rmdirSync } from "fs";
import { tmpdir } from "os";
import { normalize } from "path";
import { FileSystem, SeekOrigin } from "../core";
import { NotFoundError } from "../errors";
import "../index";
import { toBuffer } from "../node/buffer";
import { NodeFileSystem } from "../node/NodeFileSystem";
import { toString } from "../node/text";
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
  const text = toString(buffer);
  expect(text).toBe("test");
});

test("continuous read and write", async () => {
  const file = await fs.openFile("/otani.txt");

  const ws = file.openWriteStream();
  await ws.write(toBuffer("大谷"));
  await ws.write(toBuffer("翔平"));

  const rs = file.openReadStream();
  let buffer = await rs.read(6);
  let text = toString(buffer);
  expect(text).toBe("大谷");

  await rs.seek(6, SeekOrigin.Begin);
  buffer = await rs.read();
  text = toString(buffer);
  expect(text).toBe("翔平");

  await ws.seek(0, SeekOrigin.End);
  ws.write(toBuffer("ホームラン"));

  await rs.seek(0, SeekOrigin.Begin);
  buffer = await rs.read();
  text = toString(buffer);
  expect(text).toBe("大谷翔平ホームラン");

  await ws.close();
  await rs.close();
});

test("mkdir test", async () => {
  const dir = await fs.openDirectory("/");
  let dirs = await dir.readdir();
  expect(dirs.length).toBe(3);
  expect(0 <= dirs.indexOf("/empty.txt")).toBe(true);
  expect(0 <= dirs.indexOf("/test.txt")).toBe(true);
  expect(0 <= dirs.indexOf("/otani.txt")).toBe(true);

  const folder = await fs.openDirectory("/folder");
  try {
    await folder.getStats();
    fail("Found folder: " + folder.path);
  } catch (e) {
    expect(e).toBeInstanceOf(NotFoundError);
  }
  await folder.mkdir();
  const stats = await folder.getStats();
  console.log(stats);

  dirs = await dir.readdir();
  expect(dirs.length).toBe(4);
  expect(0 <= dirs.indexOf("/empty.txt")).toBe(true);
  expect(0 <= dirs.indexOf("/test.txt")).toBe(true);
  expect(0 <= dirs.indexOf("/otani.txt")).toBe(true);
  expect(0 <= dirs.indexOf("/folder")).toBe(true);
});
