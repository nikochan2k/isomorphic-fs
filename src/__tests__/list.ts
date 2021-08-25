import { FileSystem } from "../core";
import { NotFoundError, TypeMismatchError } from "../errors";

export const testAll = (fs: FileSystem) => {
  test("rootdir", async () => {
    const list = await fs.list("/");
    expect(list.length).toBe(0);
  });

  test("nothing", async () => {
    const [stats, e] = await fs.list("/nothing");
    if (stats) fail("/nothing exists");
    expect(e.name).toBe(NotFoundError.name);
  });

  test("file_list", async () => {
    await fs.writeAll("/file_list", new ArrayBuffer(1));
    const [list, e] = await fs.list("/file_list");
    if (list) fail("/nothing exists");
    expect(e.name === TypeMismatchError.name).toBe(true);
  });
};
