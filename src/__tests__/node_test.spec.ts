import { rmdirSync } from "fs";
import { tmpdir } from "os";
import { normalize } from "path";
import { FileSystem, SeekOrigin } from "../core/common";
import { NotFoundError } from "../core/errors";
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
  const dir = await fs.getDirectory("/");
  try {
    await dir.stat();
    fail("Found directory: " + dir.path);
  } catch (e) {
    expect(e).toBeInstanceOf(NotFoundError);
  }
  await dir.mkdir();
  const paths = await dir.readdir();
  expect(paths.length).toBe(0);
});

test("add empty file", async () => {
  const file = await fs.getFile("/empty.txt");
  try {
    await file.stat();
    fail("Found file: " + file.path);
  } catch (e) {
    expect(e).toBeInstanceOf(NotFoundError);
  }
  const buffer = toBuffer("");
  const ws = await file.openWriteStream();
  await ws.write(buffer);
  await ws.close();
  const stats = await file.stat();
  expect(stats.size).toBe(0);
});

test("add text file", async () => {
  const file = await fs.getFile("/test.txt");
  try {
    await file.stat();
    fail("Found file: " + file.path);
  } catch (e) {
    expect(e).toBeInstanceOf(NotFoundError);
  }
  const buffer = toBuffer("test");
  const ws = await file.openWriteStream();
  await ws.write(buffer);
  await ws.close();
  const stats = await file.stat();
  expect(stats.size).toBe(4);
});

test("read text file", async () => {
  const file = await fs.getFile("/test.txt");
  const rs = await file.openReadStream();
  const buffer = await rs.read();
  expect(buffer.byteLength).toBe(4);
  const text = toString(buffer);
  expect(text).toBe("test");
});

test("continuous read and write", async () => {
  const file = await fs.getFile("/otani.txt");

  const ws = await file.openWriteStream();
  await ws.write(toBuffer("大谷"));
  await ws.write(toBuffer("翔平"));

  const rs = await file.openReadStream();
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

  await rs.seek(0, SeekOrigin.Begin);
  await rs.read(6);
  await rs.seek(6, SeekOrigin.Current);
  buffer = await rs.read();
  text = toString(buffer);
  expect(text).toBe("ホームラン");

  await ws.close();
  await rs.close();
});

test("mkdir test", async () => {
  const dir = await fs.getDirectory("/");
  let dirs = await dir.readdir();
  expect(dirs.length).toBe(3);
  expect(0 <= dirs.indexOf("/empty.txt")).toBe(true);
  expect(0 <= dirs.indexOf("/test.txt")).toBe(true);
  expect(0 <= dirs.indexOf("/otani.txt")).toBe(true);

  const folder = await fs.getDirectory("/folder");
  try {
    await folder.stat();
    fail("Found folder: " + folder.path);
  } catch (e) {
    expect(e).toBeInstanceOf(NotFoundError);
  }
  await folder.mkdir();
  await folder.stat();

  dirs = await dir.readdir();
  expect(dirs.length).toBe(4);
  expect(0 <= dirs.indexOf("/empty.txt")).toBe(true);
  expect(0 <= dirs.indexOf("/test.txt")).toBe(true);
  expect(0 <= dirs.indexOf("/otani.txt")).toBe(true);
  expect(0 <= dirs.indexOf("/folder")).toBe(true);
});

test("create file in dir", async () => {
  const file = await fs.getFile("/folder/sample.txt");
  try {
    await file.stat();
    fail("Found file: " + file.path);
  } catch (e) {
    expect(e).toBeInstanceOf(NotFoundError);
  }
  const ws = await file.openWriteStream();
  const outBuf = toBuffer("Sample");
  const before = Date.now();
  await ws.write(outBuf);
  await ws.close();

  const after = Date.now() + 1;
  const stats = await file.stat();
  const modified = stats.modified ?? 0;
  expect(before <= modified && modified <= after).toBe(true);

  const rs = await file.openReadStream();
  const inBuf = await rs.read();
  const text = toString(inBuf);
  expect(text).toBe("Sample");
  rs.close();

  const dir = await fs.getDirectory("/folder/");
  const list = await dir.list();
  expect(0 <= list.indexOf("/folder/sample.txt")).toBe(true);
});
