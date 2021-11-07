import { Converter } from "univ-conv";
import { FileSystem } from "../core";
import { NotFoundError } from "../errors";

const c = new Converter();

export const testAll = (
  fs: FileSystem,
  options?: {
    setup: () => Promise<void>;
    teardown: () => Promise<void>;
  }
) => {
  it("setup", async () => {
    if (options?.setup) {
      await options.setup();
    }
  });

  it("rootdir", async () => {
    const dir = await fs.getDirectory("/");
    const paths = await dir.readdir();
    expect(paths.length).toBe(0);
  });

  it("add empty file", async () => {
    const file = await fs.getFile("/empty.txt");
    try {
      await file.stat();
      throw new Error("Found file: " + file.path);
    } catch (e) {
      expect(e.name).toBe(NotFoundError.name);
    }
    const buffer = await c.toArrayBuffer("");
    await file.write(buffer);
    const stats = await file.stat();
    expect(stats.size).toBe(0);
  });

  it("add text file", async () => {
    const file = await fs.getFile("/test.txt");
    try {
      await file.stat();
      throw new Error("Found file: " + file.path);
    } catch (e) {
      expect(e.name).toBe(NotFoundError.name);
    }
    const buffer = await c.toArrayBuffer("test");
    await file.write(buffer);
    const stats = await file.stat();
    expect(stats.size).toBe(4);
  });

  it("read text file", async () => {
    const file = await fs.getFile("/test.txt");
    const buffer = await file.read({ type: "Uint8Array" });
    expect(buffer.byteLength).toBe(4);
    const text = await c.toText(buffer);
    expect(text).toBe("test");
  });

  it("continuous read and write", async () => {
    const file = await fs.getFile("/otani.txt");
    await file.write("大谷翔平");
    let text = await file.read({ type: "UTF8" });
    expect(text).toBe("大谷翔平");

    await file.write("ホームラン", { append: true, create: false });
    text = await file.read({ type: "UTF8" });
    expect(text).toBe("大谷翔平ホームラン");
  });

  it("mkdir test", async () => {
    const dir = await fs.getDirectory("/");
    let dirs = await dir.readdir();
    expect(dirs.length).toBe(3);
    expect(0 <= dirs.indexOf("/empty.txt")).toBe(true);
    expect(0 <= dirs.indexOf("/test.txt")).toBe(true);
    expect(0 <= dirs.indexOf("/otani.txt")).toBe(true);

    const folder = await fs.getDirectory("/folder");
    try {
      await folder.stat();
      throw new Error("Found folder: " + folder.path);
    } catch (e) {
      expect(e.name).toBe(NotFoundError.name);
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

  it("create file in dir", async () => {
    const file = await fs.getFile("/folder/sample.txt");
    try {
      await file.stat();
      throw new Error("Found file: " + file.path);
    } catch (e) {
      expect(e.name).toBe(NotFoundError.name);
    }
    const before = Math.floor(Date.now() / 1000);
    await file.write("Sample");
    const after = before + 1;
    const stats = await file.stat();
    const modified = Math.floor((stats.modified ?? 0) / 1000);
    expect(before <= modified && modified <= after).toBe(true);
    const text = await file.read({ type: "UTF8" });
    expect(text).toBe("Sample");

    const dir = await fs.getDirectory("/folder/");
    const list = await dir.list();
    expect(0 <= list.indexOf("/folder/sample.txt")).toBe(true);
  });

  it("copy directory", async () => {
    const from = await fs.getDirectory("/folder");
    const to = await fs.getDirectory("/folder2");
    const errors = await from.copy(to, { force: false, recursive: true });
    expect(errors.length).toBe(0);
    const stats = await to.stat();
    expect(stats.size).toBeUndefined();
    const root = await fs.getDirectory("/");
    const list = await root.ls();
    expect(0 <= list.indexOf("/folder2")).toBe(true);
    const toList = await to.ls();
    expect(0 <= toList.indexOf("/folder2/sample.txt")).toBe(true);
  });

  it("move file", async () => {
    await fs.move("/folder2/sample.txt", "/folder2/sample2.txt");
    const list = await fs.list("/folder2");
    expect(list.indexOf("/folder2/sample.txt") < 0).toBe(true);
    expect(0 <= list.indexOf("/folder2/sample2.txt")).toBe(true);
  });

  it("move directory", async () => {
    const errors = await fs.move("/folder2", "/folder3");
    expect(errors.length).toBe(0);
    const root = await fs.getDirectory("/");
    const list = await root.ls();
    expect(list.indexOf("/folder2") < 0).toBe(true);
    expect(0 <= list.indexOf("/folder3")).toBe(true);
    const folder3 = await fs.getDirectory("/folder3");
    const folder3List = await folder3.ls();
    expect(0 <= folder3List.indexOf("/folder3/sample2.txt")).toBe(true);
  });

  it("teardown", async () => {
    if (options?.teardown) {
      await options.teardown();
    }
  });
};
