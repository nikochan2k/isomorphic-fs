import { DEFAULT_BUFFER_SIZE } from "../core";
import { isUint8Array, textEncoder } from "./buffer";

const EMPTY_BUFFER = Buffer.from([]);

const hasBuffer = typeof Buffer === "function";

export function isBuffer(value: any): value is Buffer {
  return (
    hasBuffer &&
    (value instanceof Buffer || toString.call(value) === "[object Buffer]")
  );
}

async function base64ToBuffer(base64: string) {
  return Buffer.from(base64, "base64");
}

export async function toBuffer(
  value: ArrayBuffer | Uint8Array | Buffer | string,
  encoding: "utf8" | "base64" = "utf8"
): Promise<Buffer> {
  if (!value) {
    return EMPTY_BUFFER;
  }

  if (isBuffer(value)) {
    return value;
  }

  if (typeof value === "string") {
    if (encoding === "utf8") {
      value = textEncoder.encode(value);
    } else {
      let byteLength = 0;
      const chunks: Buffer[] = [];
      for (
        let start = 0, end = value.length;
        start < end;
        start += DEFAULT_BUFFER_SIZE
      ) {
        const base64 = value.slice(start, start + DEFAULT_BUFFER_SIZE);
        const chunk = await base64ToBuffer(base64);
        byteLength += chunk.byteLength;
        chunks.push(chunk);
      }
      let offset = 0;
      const buffer = Buffer.alloc(byteLength);
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return buffer;
    }
  }

  if (isUint8Array(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }

  return Buffer.from(value);
}
