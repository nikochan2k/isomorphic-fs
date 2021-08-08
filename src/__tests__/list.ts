import "../polyfill";
import { FileSystem } from "../core";
import { NotFoundError, NotSupportedError } from "../core/errors";

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
      expect(e.code).toBe(NotFoundError.code);
    }
  });

  test("file_list", async () => {
    await fs.writeAll("/file_list", new ArrayBuffer(1));
    try {
      await fs.list("/file_list");
      fail("/nothing exists");
    } catch (e) {
      expect(e.code).toBe(NotSupportedError.code);
    }
  });
};
