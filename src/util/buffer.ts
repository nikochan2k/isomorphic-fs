import { decode } from "base64-arraybuffer";

export const EMPTY_ARRAY_BUFFER = new ArrayBuffer(0);
export const EMPTY_U8 = new Uint8Array(0);

export const textEncoder = new TextEncoder();

const hasArrayBuffer = typeof ArrayBuffer === "function";

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return (
    hasArrayBuffer &&
    (value instanceof ArrayBuffer ||
      toString.call(value) === "[object ArrayBuffer]")
  );
}

export function toArrayBuffer(
  value: ArrayBuffer | Uint8Array | string,
  encoding: "utf8" | "base64" = "utf8"
) {
  if (!value) {
    return EMPTY_ARRAY_BUFFER;
  }

  if (typeof value === "string") {
    if (encoding === "utf8") {
      value = textEncoder.encode(value);
    } else {
      return decode(value);
    }
  }

  if (isUint8Array(value)) {
    const viewLength = value.length;
    const buffer = value.buffer;
    if (viewLength === buffer.byteLength) {
      return buffer;
    }

    const newBuffer = new ArrayBuffer(viewLength);
    const newView = new Uint8Array(newBuffer);
    for (let i = 0; i < viewLength; i++) {
      newView[i] = value[i] || 0;
    }
    return newBuffer;
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

export function toUint8Array(
  value: ArrayBuffer | Uint8Array | string,
  encoding: "utf8" | "base64" = "utf8"
) {
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
      value = decode(value);
    }
  }

  return new Uint8Array(value);
}
