import { isUint8Array, textEncoder } from "../util/buffer";

const EMPTY_BUFFER = Buffer.from([]);

const hasBuffer = typeof Buffer === "function";

export function isBuffer(value: any): value is Buffer {
  return (
    hasBuffer &&
    (value instanceof Buffer || toString.call(value) === "[object Buffer]")
  );
}

export function toBuffer(
  value: ArrayBuffer | Uint8Array | Buffer | string,
  encoding: "utf8" | "base64" = "utf8"
): Buffer {
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
      return Buffer.from(value, "base64");
    }
  }

  if (isUint8Array(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }

  return Buffer.from(value);
}
