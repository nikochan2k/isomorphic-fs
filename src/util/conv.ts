import { decode, encode } from "base64-arraybuffer";
import {
  DEFAULT_BUFFER_SIZE,
  EncodingType,
  Source,
  StringSource,
} from "../core";

export const EMPTY_ARRAY_BUFFER = new ArrayBuffer(0);

export function isArrayBuffer(src: unknown): src is ArrayBuffer {
  return (
    src instanceof ArrayBuffer || toString.call(src) === "[object ArrayBuffer]"
  );
}

export const EMPTY_U8 = new Uint8Array(0);

export function isUint8Array(src: unknown): src is Uint8Array {
  return (
    src instanceof Uint8Array ||
    toString.call(src) === "[object Uint8Array]" ||
    toString.call(src) === "[object Buffer]"
  );
}

export const hasBuffer = typeof Buffer === "function";

if (hasBuffer) {
  var EMPTY_BUFFER = Buffer.from([]);
}

export function isBuffer(src: any): src is Buffer {
  return (
    hasBuffer &&
    (src instanceof Buffer || toString.call(src) === "[object Buffer]")
  );
}

export const hasBlob = typeof Blob === "function";

if (hasBlob) {
  var EMPTY_BLOB = new Blob([]);
}

export function isBlob(src: unknown): src is Blob {
  return (
    hasBlob && (src instanceof Blob || toString.call(src) === "[object Blob]")
  );
}

export function isStringSource(src: any): src is StringSource {
  if (src == null) {
    return false;
  }
  if (typeof src.value !== "string") {
    return false;
  }
  const encoding = src.encoding as EncodingType;
  return (
    encoding === "Text" || encoding === "Base64" || encoding === "BinaryString"
  );
}

let hasReadAsArrayBufer = false;
let hasReadAsBinaryString = false;
if (hasBlob) {
  if (navigator?.product !== "ReactNative") {
    hasReadAsArrayBufer = FileReader.prototype.readAsArrayBuffer != null;
    hasReadAsBinaryString = FileReader.prototype.readAsBinaryString != null;
  }
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function getSize(src: Source) {
  if (!src) {
    return 0;
  }
  if (isUint8Array(src)) {
    return src.byteLength;
  }
  if (isBlob(src)) {
    return src.size;
  }
  if (isStringSource(src)) {
    const value = src.value;
    const encoding = src.encoding;
    switch (encoding) {
      case "BinaryString":
        return value.length;
      case "Base64":
        const len = value.length;
        const baseLen = (len * 3) / 4;
        let padding = 0;
        for (let i = len - 1; value[i] === "="; i--) {
          padding++;
        }
        return baseLen - padding;
      case "Text":
        return textEncoder.encode(value).byteLength;
    }
  }
  return src.byteLength;
}

export function dataUrlToBase64(dataUrl: string) {
  const index = dataUrl.indexOf(",");
  if (0 <= index) {
    return dataUrl.substr(index + 1);
  }
  return dataUrl;
}

export function validateBufferSize(options: { bufferSize?: number }) {
  if (!options.bufferSize) {
    options.bufferSize = DEFAULT_BUFFER_SIZE;
  }
  const rem = options.bufferSize % 6;
  if (rem !== 0) {
    options.bufferSize -= rem;
    console.info(
      `"bufferSize" was modified to ${options.bufferSize}. ("bufferSize" must be divisible by 6.)`
    );
  }
  return options.bufferSize;
}

export interface ConverterOptions {
  bufferSize?: number;
}

export class Converter {
  private bufferSize: number;

  constructor(options?: ConverterOptions) {
    if (!options) {
      options = {};
    }
    this.bufferSize = validateBufferSize(options);
  }

  public async toArrayBuffer(src: Source): Promise<ArrayBuffer> {
    if (!src) {
      return EMPTY_ARRAY_BUFFER;
    }

    if (isUint8Array(src)) {
      if (src.byteLength === 0) {
        return EMPTY_ARRAY_BUFFER;
      }
      const u8 = src.slice(src.byteOffset, src.byteOffset + src.byteLength);
      return u8.buffer;
    }
    if (isBlob(src)) {
      if (src.size === 0) {
        return EMPTY_ARRAY_BUFFER;
      }
      const u8 = await this.toUint8Array(src);
      return u8.buffer;
    }
    if (isStringSource(src)) {
      const u8 = await this.toUint8Array(src);
      return u8.buffer;
    }

    return src;
  }

  public async toBase64(src: Source): Promise<string> {
    const awaitingSize = this.bufferSize;
    if (isBuffer(src)) {
      const chunks: string[] = [];
      for (
        let start = 0, end = src.byteLength;
        start < end;
        start += awaitingSize
      ) {
        const buf = src.slice(start, start + awaitingSize);
        const chunk = await this._bufferToBase64(buf);
        chunks.push(chunk);
      }
      return chunks.join("");
    }
    if (isStringSource(src)) {
      const value = src.value;
      if (!value) {
        return "";
      }

      const encoding = src.encoding;
      if (encoding === "Base64") {
        return value;
      }
    }

    const u8 = await this.toUint8Array(src);
    const chunks: string[] = [];
    for (
      let begin = 0, end = u8.byteLength;
      begin < end;
      begin += awaitingSize
    ) {
      const buf = u8.slice(begin, begin + awaitingSize).buffer;
      const chunk = await this._arrayBufferToBase64(buf);
      chunks.push(chunk);
    }
    return chunks.join("");
  }

  public async toBinaryString(src: Source): Promise<string> {
    const awaitingSize = this.bufferSize;
    if (isBuffer(src)) {
      const chunks: string[] = [];
      for (
        let start = 0, end = src.byteLength;
        start < end;
        start += awaitingSize
      ) {
        const buf = src.slice(start, start + awaitingSize);
        const chunk = await this._bufferToBinaryString(buf);
        chunks.push(chunk);
      }
      return chunks.join("");
    }
    if (isBlob(src) && hasReadAsBinaryString) {
      return this._blobToBinaryString(src);
    }
    if (isStringSource(src)) {
      const value = src.value;
      if (!value) {
        return "";
      }
      if (src.encoding === "BinaryString") {
        return value;
      }
    }

    const u8 = await this.toUint8Array(src);
    const chunks: string[] = [];
    for (
      let begin = 0, end = u8.byteLength;
      begin < end;
      begin += awaitingSize
    ) {
      const u8Chunk = u8.slice(begin, begin + awaitingSize);
      const chunk = await this._uint8ArrayToBinaryString(u8Chunk);
      chunks.push(chunk);
    }
    return chunks.join("");
  }

  public async toBlob(src: Source): Promise<Blob> {
    if (!hasBlob) {
      throw new Error("Blob is not supported");
    }

    if (!src) {
      return EMPTY_BLOB;
    }

    if (isBlob(src)) {
      return src;
    }
    if (isArrayBuffer(src)) {
      return new Blob([src]);
    }

    const ab = await this.toArrayBuffer(src);
    return new Blob([ab]);
  }

  public async toBuffer(src: Source): Promise<Buffer> {
    if (!hasBuffer) {
      throw new Error("Buffer is not suppoted.");
    }

    if (!src) {
      return EMPTY_BUFFER;
    }

    if (isBuffer(src)) {
      return src;
    }
    if (isUint8Array(src)) {
      if (src.byteLength === 0) {
        return EMPTY_BUFFER;
      }
      return Buffer.from(src.buffer, src.byteOffset, src.byteLength);
    }
    if (isBlob(src)) {
      if (src.size === 0) {
        return EMPTY_BUFFER;
      }
      return Buffer.from(await this.toArrayBuffer(src));
    }
    if (isStringSource(src)) {
      const encoding = src.encoding;
      if (encoding === "Text") {
        const u8 = await this._textToUint8Array(src.value);
        return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength);
      } else {
        const value = src.value;
        const awaitingSize = this.bufferSize;
        let byteLength = 0;
        const chunks: Buffer[] = [];
        for (
          let start = 0, end = value.length;
          start < end;
          start += awaitingSize
        ) {
          const str = value.slice(start, start + awaitingSize);
          const chunk = await (encoding === "Base64"
            ? this._base64ToBuffer(str)
            : this._binaryStringToBuffer(str));
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

    return Buffer.from(src);
  }

  public async toText(src: Source): Promise<string> {
    if (isBuffer(src)) {
      return src.toString("utf8");
    }
    if (isBlob(src)) {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = function (ev) {
          reject(reader.error || ev);
        };
        reader.onload = function () {
          resolve(reader.result as string);
        };
        reader.readAsText(src);
      });
    }
    if (isStringSource(src)) {
      const value = src.value;
      if (!value) {
        return "";
      }
      const encoding = src.encoding;
      if (encoding === "Text") {
        return value;
      }
    }

    const u8 = await this.toUint8Array(src);
    return this._uint8ArrayToText(u8);
  }

  public async toUint8Array(src: Source): Promise<Uint8Array> {
    if (!src) {
      return EMPTY_U8;
    }

    if (isUint8Array(src)) {
      return src;
    }
    if (isBlob(src)) {
      if (src.size === 0) {
        return EMPTY_U8;
      }
      if (hasReadAsArrayBufer) {
        return this._blobToUint8Array(src);
      } else {
        return this.toUint8Array({
          value: await this._blobToBase64(src),
          encoding: "Base64",
        });
      }
    }
    if (isStringSource(src)) {
      const value = src.value;
      if (!value) {
        return EMPTY_U8;
      }

      const encoding = src.encoding;
      if (encoding === "Text") {
        return await this._textToUint8Array(value);
      } else if (encoding === "Base64") {
        return new Uint8Array(await this._base64ToArrayBuffer(value));
      } else {
        return Uint8Array.from(value.split(""), (e) => e.charCodeAt(0));
      }
    }

    return new Uint8Array(src);
  }

  protected async _arrayBufferToBase64(buffer: ArrayBuffer) {
    return encode(buffer);
  }

  protected async _base64ToArrayBuffer(base64: string) {
    return decode(base64);
  }

  protected async _base64ToBuffer(base64: string) {
    return Buffer.from(base64, "base64");
  }

  protected async _binaryStringToBuffer(bin: string) {
    return Buffer.from(bin, "binary");
  }

  protected async _blobToBase64(blob: Blob): Promise<string> {
    if (blob.size === 0) {
      return "";
    }

    const awaitingSize = this.bufferSize;
    const chunks: string[] = [];
    for (let start = 0, end = blob.size; start < end; start += awaitingSize) {
      const blobChunk = blob.slice(start, start + awaitingSize);
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

  protected async _blobToBinaryString(blob: Blob): Promise<string> {
    if (blob.size === 0) {
      return "";
    }

    const awaitingSize = this.bufferSize;
    const chunks: string[] = [];
    for (let start = 0, end = blob.size; start < end; start += awaitingSize) {
      const blobChunk = blob.slice(start, start + awaitingSize);
      const chunk = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = function (ev) {
          reject(reader.error || ev);
        };
        reader.onload = function () {
          resolve(reader.result as string);
        };
        reader.readAsBinaryString(blobChunk);
      });
      chunks.push(chunk);
    }
    return chunks.join("");
  }

  protected async _blobToUint8Array(blob: Blob) {
    if (blob.size === 0) {
      return EMPTY_U8;
    }

    const awaitingSize = this.bufferSize;
    let byteLength = 0;
    const chunks: ArrayBuffer[] = [];
    for (let start = 0, end = blob.size; start < end; start += awaitingSize) {
      const blobChunk = blob.slice(start, start + awaitingSize);
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
    return u8;
  }

  protected async _bufferToBase64(buffer: Buffer) {
    return buffer.toString("base64");
  }

  protected async _bufferToBinaryString(buffer: Buffer) {
    return buffer.toString("binary");
  }

  protected async _uint8ArrayToBinaryString(u8: Uint8Array) {
    return Array.from(u8, (e) => String.fromCharCode(e)).join("");
  }

  protected async _uint8ArrayToText(u8: Uint8Array) {
    return textDecoder.decode(u8);
  }

  private async _textToUint8Array(text: string) {
    return textEncoder.encode(text);
  }
}
