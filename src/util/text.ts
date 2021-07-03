import { encode } from "base64-arraybuffer";
import {
  isUint8Array,
  textEncoder,
  toArrayBuffer,
  toUint8Array,
} from "./buffer";

export const textDecoder = new TextDecoder();

export function toBase64(
  value: ArrayBuffer | Uint8Array | string,
  encoding: "utf8" | "base64" = "utf8"
): string {
  if (typeof value === "string") {
    if (encoding === "base64") {
      return value;
    } else {
      value = textEncoder.encode(value);
    }
  }

  if (isUint8Array(value)) {
    value = toArrayBuffer(value);
  }

  return encode(value);
}

export function toString(
  value: ArrayBuffer | Uint8Array | string,
  encoding: "utf8" | "base64" = "utf8"
): string {
  if (typeof value === "string") {
    if (encoding === "base64") {
      value = toUint8Array(encoding, "base64");
    } else {
      return value;
    }
  }

  if (!isUint8Array(value)) {
    value = toUint8Array(value);
  }

  return textDecoder.decode(value);
}
