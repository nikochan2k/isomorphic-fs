import "../polyfill";
import { FileSystem } from "../core";
import { NotFoundError, NotReadableError } from "../core/errors";

export const testAll = (fs: FileSystem) => {
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
};
