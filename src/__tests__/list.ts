import { FileSystem } from "../core";
import { NotFoundError, TypeMismatchError } from "../core/errors";
import "../polyfill";

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

  test("file_list", async () => {
    await fs.writeAll("/file_list", new ArrayBuffer(1));
    try {
      await fs.list("/file_list");
      fail("/nothing exists");
    } catch (e) {
      expect(e).toBeInstanceOf(TypeMismatchError);
    }
  });
};
