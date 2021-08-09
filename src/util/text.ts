import * as ba from "base64-arraybuffer";
import { DEFAULT_BUFFER_SIZE } from "../core";
import { isUint8Array, textEncoder, toUint8Array } from "./buffer";

export const textDecoder = new TextDecoder();

async function encode(buffer: ArrayBuffer) {
  return ba.encode(buffer);
}

export async function toBase64(
  value: ArrayBuffer | Uint8Array | string,
  encoding: "utf8" | "base64" = "utf8"
): Promise<string> {
  if (typeof value === "string") {
    if (encoding === "base64") {
      return value;
    } else {
      value = textEncoder.encode(value);
    }
  }

  if (!isUint8Array(value)) {
    value = new Uint8Array(value);
  }

  const chunks: string[] = [];
  for (
    let begin = 0, end = value.byteLength;
    begin < end;
    begin += DEFAULT_BUFFER_SIZE
  ) {
    const buf = value.slice(begin, begin + DEFAULT_BUFFER_SIZE);
    const chunk = await encode(buf);
    chunks.push(chunk);
  }
  const base64 = chunks.join("");
  return base64;
}

export async function toString(
  value: ArrayBuffer | Uint8Array | string,
  encoding: "utf8" | "base64" = "utf8"
): Promise<string> {
  if (typeof value === "string") {
    if (encoding === "base64") {
      value = await toUint8Array(encoding, "base64");
    } else {
      return value;
    }
  }

  if (!isUint8Array(value)) {
    value = await toUint8Array(value);
  }

  return textDecoder.decode(value);
}
