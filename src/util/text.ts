import { encode } from "base64-arraybuffer";
import { DEFAULT_BUFFER_SIZE } from "../core";
import { isBlob, isBuffer, textEncoder, toUint8Array } from "./binary";

export const textDecoder = new TextDecoder();

async function arrayBufferToBase64(buffer: ArrayBuffer) {
  return encode(buffer);
}

async function bufferToBase64(buffer: Buffer) {
  return buffer.toString("base64");
}

export async function toBase64(
  value: ArrayBuffer | Uint8Array | Buffer | Blob | string
): Promise<string> {
  if (typeof value === "string") {
    value = textEncoder.encode(value);
  } else if (isBuffer(value)) {
    const chunks: string[] = [];
    for (
      let start = 0, end = value.byteLength;
      start < end;
      start += DEFAULT_BUFFER_SIZE
    ) {
      const buf = value.slice(start, start + DEFAULT_BUFFER_SIZE);
      const chunk = await bufferToBase64(buf);
      chunks.push(chunk);
    }
    const base64 = chunks.join("");
    return base64;
  }

  const u8 = await toUint8Array(value);
  const chunks: string[] = [];
  for (
    let begin = 0, end = u8.byteLength;
    begin < end;
    begin += DEFAULT_BUFFER_SIZE
  ) {
    const buf = u8.slice(begin, begin + DEFAULT_BUFFER_SIZE).buffer;
    const chunk = await arrayBufferToBase64(buf);
    chunks.push(chunk);
  }
  const base64 = chunks.join("");
  return base64;
}

export async function toText(
  value: ArrayBuffer | Uint8Array | Buffer | Blob | string
): Promise<string> {
  if (isBuffer(value)) {
    return value.toString("utf8");
  }
  if (isBlob(value) && !(navigator && navigator.product === "ReactNative")) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = function (ev) {
        reject(reader.error || ev);
      };
      reader.onload = function () {
        resolve(reader.result as string);
      };
      reader.readAsText(value);
    });
  }

  return textDecoder.decode(await toUint8Array(value, "base64"));
}
