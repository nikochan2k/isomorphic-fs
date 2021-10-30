import { FileSystem } from "../core";
import { NotFoundError } from "../errors";

export const testAll = (fs: FileSystem, init: () => Promise<void>) => {
  beforeAll(async () => {
    await init();
  });

  it("rootdir", async () => {
    const stat = await fs.head("/");
    expect(stat.size).toBeUndefined();
  });

  it("nothing", async () => {
    try {
      await fs.stat("/nothing");
      fail("/nothing exists");
    } catch (e) {
      expect(e.name).toBe(NotFoundError.name);
    }
  });

  it("file_head", async () => {
    await fs.write("/file_head", new ArrayBuffer(1));
    const stat = await fs.stat("/file_head");
    expect(stat.size).toBe(1);
  });
};
