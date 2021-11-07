import { FileSystem } from "../core";
import { NotFoundError, TypeMismatchError } from "../errors";

export const testAll = (
  fs: FileSystem,
  options?: {
    setup?: () => Promise<void>;
    teardown?: () => Promise<void>;
  }
) => {
  it("setup", async () => {
    if (options?.setup) {
      await options.setup();
    }
  });

  it("rootdir", async () => {
    const list = await fs.list("/");
    expect(list.length).toBe(0);
  });

  it("nothing", async () => {
    try {
      await fs.list("/nothing");
      throw new Error("/nothing exists");
    } catch (e) {
      expect(e.name).toBe(NotFoundError.name);
    }
  });

  it("file_list", async () => {
    await fs.write("/file_list", new ArrayBuffer(1));
    try {
      await fs.list("/file_list");
      throw new Error("/nothing exists");
    } catch (e) {
      expect(
        e.name === TypeMismatchError.name || e.name === NotFoundError.name
      ).toBe(true);
    }
  });

  it("teardown", async () => {
    if (options?.teardown) {
      await options.teardown();
    }
  });
};
