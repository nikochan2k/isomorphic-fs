const hasArrayBuffer = typeof ArrayBuffer === "function";
const hasUint8Array = typeof Uint8Array === "function";
const hasBuffer = typeof Buffer === "function";

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return (
    hasArrayBuffer &&
    (value instanceof ArrayBuffer ||
      toString.call(value) === "[object ArrayBuffer]")
  );
}

export function isBuffer(value: any): value is Buffer {
  return (
    hasBuffer &&
    (value instanceof Buffer || toString.call(value) === "[object Buffer]")
  );
}

export function isUint8Array(value: unknown): value is Uint8Array {
  return (
    hasUint8Array &&
    (value instanceof Uint8Array ||
      toString.call(value) === "[object Uint8Array]")
  );
}
