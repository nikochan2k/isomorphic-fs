import { Readable } from "stream";
import { Data, DEFAULT_CONVERTER } from "univ-conv";

export interface Modification {
  data: Data;
  start: number;
  length?: number;
}

export class ModifiedReadable extends Readable {
  private index = 0;
  private mods: Modification[];

  constructor(private src: Readable, ...mods: Modification[]) {
    super();
    this.mods = mods;
    src.once("readable", () => this.setup());
  }

  private setup() {
    const onData = (value: unknown) => {
      const chunk = value as Uint8Array;
      const size = chunk.byteLength;
      try {
        const iStart = this.index;
        const iEnd = this.index + chunk.byteLength;
        for (const mod of this.mods) {
          const mStart = mod.start;
          const mEnd =
            mod.start +
            (mod.length == null ? Number.MAX_SAFE_INTEGER : mod.length);
          if (mStart <= iStart && iEnd <= mEnd) {
            /*
            (10)
            chunk:   |---|
            mod  : |-------|
            (11)
            chunk:    |----|
            mod  : |-------|
            (12)
            chunk: |-------|
            mod  : |-------|
            (13)
            chunk: |----|
            mod  : |-------|
            */
            const start = iStart - mStart;
            const length = size;
            this.push(DEFAULT_CONVERTER.slice(mod.data, { start, length }));
            return;
          } else if (iStart <= mStart && mStart <= iEnd) {
            /*
            (1)
            chunk: |-------|
            mod  :    |-------|
            (2)
            chunk: |-------|
            mod  :    |----|
            (3)
            chunk: |-------|
            mod  :    |--|
            (4)
            chunk: |-------|
            mod  : |----|
            */
            const chunkLen = mStart - iStart;
            if (0 < chunkLen) {
              /*
              (1)
              chunk: |-------|
              mod  :    |-------|
              (2)
              chunk: |-------|
              mod  :    |----|
              (3)
              chunk: |-------|
              mod  :    |--|
              */
              this.push(chunk.slice(0, chunkLen));
            }

            if (mEnd < iEnd) {
              /*
              (3)
              chunk: |-------|
              mod  :    |--|
              (4)
              chunk: |-------|
              mod  : |----|
              */
              const modLen = mEnd - mStart;
              this.push(
                DEFAULT_CONVERTER.slice(mod.data, {
                  start: 0,
                  length: modLen,
                })
              );
              if (mEnd < iEnd) {
                /*
                (3)
                chunk: |-------|
                mod  :    |--|
                (4)
                chunk: |-------|
                mod  : |----|
                */
                const start = mEnd - iStart;
                const length = iEnd - mEnd;
                this.push(chunk.slice(start, length));
              }
            }
            return;
          } else if (mStart < iStart && iStart < mEnd) {
            /*
            (7)
            chunk:    |-------|
            mod  : |-------|
            (8)
            chunk:    |----|
            mod  : |-------|
            (9)
            chunk:    |--|
            mod  : |-------|
            */
            const start = iStart - mStart;
            let length: number;
            if (mEnd < iEnd) {
              /*
              (7)
              chunk:    |-------|
              mod  : |-------|
              */
              length = mEnd - iStart;
            } else {
              /*
              (8)
              chunk:    |----|
              mod  : |-------|
              (9)
              chunk:    |--|
              mod  : |-------|
              */
              length = iEnd - iStart;
            }
            this.push(DEFAULT_CONVERTER.slice(mod.data, { start, length }));
            return;
          }

          this.push(chunk);
        }
      } finally {
        this.index += size;
      }
    };

    const src = this.src;
    src.once("error", (e) => {
      this.destroy(e);
      src.off("data", onData);
    });
    src.once("end", () => {
      this.push(null);
      src.off("data", onData);
    });
    src.on("data", onData);
  }

  public override _read() {
    // noop
  }
}
