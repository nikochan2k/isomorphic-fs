import "../polyfill";
import { FileSystem, NotFoundError } from "../core";

export const testAll = (fs: FileSystem) => {
  test("rootdir", async () => {
    const stat = await fs.head("/");
    expect(stat.size).toBeUndefined();
  });

  test("nothing", async () => {
    try {
      await fs.stat("/nothing");
      fail("/nothing exists");
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }
  });

  test("file", async () => {
    await fs.writeAll("/file", Buffer.alloc(1, 0).buffer);
    const stat = await fs.stat("/file");
    expect(stat.size).toBe(1);
  });
};
