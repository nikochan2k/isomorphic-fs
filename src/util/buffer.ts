import * as ba from "base64-arraybuffer";
import { DEFAULT_BUFFER_SIZE } from "../core";

export const EMPTY_ARRAY_BUFFER = new ArrayBuffer(0);
export const EMPTY_U8 = new Uint8Array(0);

export const textEncoder = new TextEncoder();

const hasArrayBuffer = typeof ArrayBuffer === "function";

async function decode(base64: string) {
  return ba.decode(base64);
}

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return (
    hasArrayBuffer &&
    (value instanceof ArrayBuffer ||
      toString.call(value) === "[object ArrayBuffer]")
  );
}

export async function toArrayBuffer(
  value: ArrayBuffer | Uint8Array | string,
  encoding: "utf8" | "base64" = "utf8"
): Promise<ArrayBuffer> {
  if (!value) {
    return EMPTY_ARRAY_BUFFER;
  }

  if (typeof value === "string") {
    if (encoding === "utf8") {
      value = textEncoder.encode(value);
    } else {
      let byteLength = 0;
      const chunks: Uint8Array[] = [];
      for (
        let from = 0, end = value.length;
        from < end;
        from += DEFAULT_BUFFER_SIZE
      ) {
        const base64Chunk = value.substr(from, DEFAULT_BUFFER_SIZE);
        const chunk = await decode(base64Chunk);
        byteLength += chunk.byteLength;
        chunks.push(new Uint8Array(chunk));
      }

      let pos = 0;
      const u8 = new Uint8Array(byteLength);
      for (const chunk of chunks) {
        u8.set(chunk, pos);
        pos += chunk.byteLength;
      }
      return u8.buffer;
    }
  }

  if (value.byteLength === 0) {
    return EMPTY_ARRAY_BUFFER;
  }

  if (isUint8Array(value)) {
    return value.slice(value.byteOffset, value.byteLength + value.byteOffset);
  }

  return value;
}

const hasUint8Array = typeof Uint8Array === "function";

export function isUint8Array(value: unknown): value is Uint8Array {
  return (
    hasUint8Array &&
    (value instanceof Uint8Array ||
      toString.call(value) === "[object Uint8Array]")
  );
}

export async function toUint8Array(
  value: ArrayBuffer | Uint8Array | string,
  encoding: "utf8" | "base64" = "utf8"
): Promise<Uint8Array> {
  if (!value) {
    return EMPTY_U8;
  }

  if (isUint8Array(value)) {
    return value;
  }

  if (typeof value === "string") {
    if (encoding === "utf8") {
      return textEncoder.encode(value);
    } else {
      value = await decode(value);
    }
  }

  return new Uint8Array(value);
}
