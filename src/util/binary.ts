import { decode } from "base64-arraybuffer";
import { DEFAULT_BUFFER_SIZE } from "../core";

export const textEncoder = new TextEncoder();

export const hasArrayBuffer = typeof ArrayBuffer === "function";

if (hasArrayBuffer) {
  var EMPTY_ARRAY_BUFFER = new ArrayBuffer(0);
}

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return (
    hasArrayBuffer &&
    (value instanceof ArrayBuffer ||
      toString.call(value) === "[object ArrayBuffer]")
  );
}

async function base64ToArrayBuffer(base64: string) {
  return decode(base64);
}

export async function toArrayBuffer(
  value: ArrayBuffer | Uint8Array | Buffer | Blob | string,
  encoding: "utf8" | "base64" = "utf8"
): Promise<ArrayBuffer> {
  if (!hasArrayBuffer) {
    throw new Error("ArrayBuffer is not supported");
  }

  if (!value) {
    return EMPTY_ARRAY_BUFFER;
  }

  if (isUint8Array(value)) {
    if (value.byteLength === 0) {
      return EMPTY_ARRAY_BUFFER;
    }
    return value.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }
  if (isBlob(value)) {
    if (value.size === 0) {
      return EMPTY_ARRAY_BUFFER;
    }
    if (navigator && navigator.product === "ReactNative") {
      return toArrayBuffer(await blobToBase64(value), "base64");
    } else {
      return blobToArrayBufferUsingReadAsArrayBuffer(value);
    }
  }
  if (typeof value === "string") {
    if (encoding === "utf8") {
      const u8 = textEncoder.encode(value);
      return u8.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    } else {
      let byteLength = 0;
      const chunks: Uint8Array[] = [];
      for (
        let from = 0, end = value.length;
        from < end;
        from += DEFAULT_BUFFER_SIZE
      ) {
        const base64Chunk = value.substr(from, DEFAULT_BUFFER_SIZE);
        const chunk = await base64ToArrayBuffer(base64Chunk);
        byteLength += chunk.byteLength;
        chunks.push(new Uint8Array(chunk));
      }

      let pos = 0;
      const u8 = new Uint8Array(byteLength);
      for (const chunk of chunks) {
        u8.set(chunk, pos);
        pos += chunk.byteLength;
      }
      return u8.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    }
  }

  return value;
}

export const hasUint8Array = typeof Uint8Array === "function";

if (hasUint8Array) {
  var EMPTY_U8 = new Uint8Array(0);
}

export function isUint8Array(value: unknown): value is Uint8Array {
  return (
    hasUint8Array &&
    (value instanceof Uint8Array ||
      toString.call(value) === "[object Uint8Array]" ||
      toString.call(value) === "[object Buffer]")
  );
}

export async function toUint8Array(
  value: ArrayBuffer | Uint8Array | Buffer | Blob | string,
  encoding: "utf8" | "base64" = "utf8"
): Promise<Uint8Array> {
  if (!hasUint8Array) {
    throw new Error("Uint8Array is not suppoted.");
  }

  if (!value) {
    return EMPTY_U8;
  }

  if (isUint8Array(value)) {
    return value;
  }
  if (isBlob(value)) {
    if (value.size === 0) {
      return EMPTY_U8;
    }
    return new Uint8Array(await toArrayBuffer(value));
  }
  if (typeof value === "string") {
    if (encoding === "utf8") {
      return textEncoder.encode(value);
    } else {
      value = await base64ToArrayBuffer(value);
    }
  }

  return new Uint8Array(value);
}

export const hasBuffer = typeof Buffer === "function";

if (hasBuffer) {
  var EMPTY_BUFFER = Buffer.from([]);
}

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
  value: ArrayBuffer | Uint8Array | Buffer | Blob | string,
  encoding: "utf8" | "base64" = "utf8"
): Promise<Buffer> {
  if (!hasBuffer) {
    throw new Error("Buffer is not suppoted.");
  }

  if (!value) {
    return EMPTY_BUFFER;
  }

  if (isBuffer(value)) {
    return value;
  }
  if (isUint8Array(value)) {
    if (value.byteLength === 0) {
      return EMPTY_BUFFER;
    }
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (isBlob(value)) {
    if (value.size === 0) {
      return EMPTY_BUFFER;
    }
    return Buffer.from(await toArrayBuffer(value));
  }
  if (typeof value === "string") {
    if (encoding === "utf8") {
      const u8 = textEncoder.encode(value);
      return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength);
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

  return Buffer.from(value);
}

export const hasBlob = typeof Blob === "function";

if (hasBlob) {
  var EMPTY_BLOB = new Blob([]);
}

export function isBlob(value: unknown): value is Blob {
  return (
    hasBlob &&
    (value instanceof Blob || toString.call(value) === "[object Blob]")
  );
}

export function dataUrlToBase64(dataUrl: string) {
  const index = dataUrl.indexOf(",");
  if (0 <= index) {
    return dataUrl.substr(index + 1);
  }
  return dataUrl;
}

async function blobToBase64(blob: Blob): Promise<string> {
  if (blob.size === 0) {
    return "";
  }

  const chunks: string[] = [];
  for (
    let start = 0, end = blob.size;
    start < end;
    start += DEFAULT_BUFFER_SIZE
  ) {
    const blobChunk = blob.slice(start, start + DEFAULT_BUFFER_SIZE);
    const chunk = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = function (ev) {
        reject(reader.error || ev);
      };
      reader.onload = function () {
        const base64 = dataUrlToBase64(reader.result as string);
        resolve(base64);
      };
      reader.readAsDataURL(blobChunk);
    });
    chunks.push(chunk);
  }
  return chunks.join("");
}

async function blobToArrayBufferUsingReadAsArrayBuffer(blob: Blob) {
  if (blob.size === 0) {
    return new ArrayBuffer(0);
  }
  let byteLength = 0;
  const chunks: ArrayBuffer[] = [];
  for (
    let start = 0, end = blob.size;
    start < end;
    start += DEFAULT_BUFFER_SIZE
  ) {
    const blobChunk = blob.slice(start, start + DEFAULT_BUFFER_SIZE);
    const chunk = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = (ev) => {
        reject(reader.error || ev);
      };
      reader.onload = () => {
        const chunk = reader.result as ArrayBuffer;
        byteLength += chunk.byteLength;
        resolve(chunk);
      };
      reader.readAsArrayBuffer(blobChunk);
    });
    chunks.push(chunk);
  }

  const u8 = new Uint8Array(byteLength);
  let pos = 0;
  for (const chunk of chunks) {
    u8.set(new Uint8Array(chunk), pos);
    pos += chunk.byteLength;
  }
  return u8.buffer;
}

export async function toBlob(
  value: ArrayBuffer | Uint8Array | Buffer | Blob | string,
  encoding: "utf8" | "base64" = "utf8"
): Promise<Blob> {
  if (!hasBlob) {
    throw new Error("Blob is not supported");
  }

  if (!value) {
    return EMPTY_BLOB;
  }

  if (isUint8Array(value)) {
    return new Blob([await toArrayBuffer(value)]);
  }
  if (isArrayBuffer(value)) {
    return new Blob([value]);
  }
  if (typeof value === "string") {
    return new Blob([await toArrayBuffer(value, encoding)]);
  }

  return value;
}
