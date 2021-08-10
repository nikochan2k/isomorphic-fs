import { DEFAULT_BUFFER_SIZE } from "../core";
import * as buf from "./buffer";

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

async function concatArrayBuffers(chunks: ArrayBuffer[], byteLength: number) {
  const u8 = new Uint8Array(byteLength);
  let pos = 0;
  for (const chunk of chunks) {
    u8.set(new Uint8Array(chunk), pos);
    pos += chunk.byteLength;
  }
  return u8.buffer;
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

  return concatArrayBuffers(chunks, byteLength);
}

async function blobToArrayBufferUsingReadAsDataUrl(blob: Blob) {
  const base64 = await blobToBase64(blob);
  if (!base64) {
    return buf.EMPTY_ARRAY_BUFFER;
  }

  return buf.toArrayBuffer(base64, "base64");
}

export async function toArrayBuffer(blob: Blob) {
  if (blob.size === 0) {
    return buf.EMPTY_ARRAY_BUFFER;
  }

  let buffer: ArrayBuffer;
  if (navigator && navigator.product === "ReactNative") {
    buffer = await blobToArrayBufferUsingReadAsDataUrl(blob);
  } else {
    buffer = await blobToArrayBufferUsingReadAsArrayBuffer(blob);
  }
  return buffer;
}
