import { FileSystem } from "../core";
import { NotFoundError, TypeMismatchError } from "../errors";

export const testAll = (
  fs: FileSystem,
  init?: (fs: FileSystem) => Promise<void>
) => {
  beforeAll(async () => {
    if (init) {
      await init(fs);
    }
  });

  it("rootdir", async () => {
    const list = await fs.list("/");
    expect(list.length).toBe(0);
  });

  it("nothing", async () => {
    try {
      await fs.list("/nothing");
      fail("/nothing exists");
    } catch (e) {
      expect(e.name).toBe(NotFoundError.name);
    }
  });

  it("file_list", async () => {
    await fs.write("/file_list", new ArrayBuffer(1));
    try {
      await fs.list("/file_list");
      fail("/nothing exists");
    } catch (e) {
      expect(e.name === TypeMismatchError.name).toBe(true);
    }
  });
};
