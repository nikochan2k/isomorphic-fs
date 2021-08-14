import { decode, encode } from "base64-arraybuffer";
import { BinaryType, DEFAULT_BUFFER_SIZE, EncodingType } from "../core";

type ParamsType = [BinaryType] | [string, EncodingType];

export const EMPTY_ARRAY_BUFFER = new ArrayBuffer(0);

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return (
    value instanceof ArrayBuffer ||
    toString.call(value) === "[object ArrayBuffer]"
  );
}

export const EMPTY_U8 = new Uint8Array(0);

export function isUint8Array(value: unknown): value is Uint8Array {
  return (
    value instanceof Uint8Array ||
    toString.call(value) === "[object Uint8Array]" ||
    toString.call(value) === "[object Buffer]"
  );
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

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface ConverterOptions {
  awaitingSize?: number;
}

export class Converter {
  private awaitingSize: number;

  constructor(options?: ConverterOptions) {
    this.awaitingSize = options?.awaitingSize || DEFAULT_BUFFER_SIZE;
  }

  public async toArrayBuffer(...params: ParamsType): Promise<ArrayBuffer> {
    const value = params[0];
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
        return this.toArrayBuffer(await this._blobToBase64(value), "Base64");
      } else {
        return this._blobToArrayBuffer(value);
      }
    }
    if (typeof value === "string") {
      const encoding = params[1];
      if (encoding === "Text") {
        const u8 = await this._textToUint8Array(value);
        return u8.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      } else {
        const awaitingSize = this.awaitingSize;
        let byteLength = 0;
        const chunks: Uint8Array[] = [];
        for (
          let from = 0, end = value.length;
          from < end;
          from += awaitingSize
        ) {
          const base64Chunk = value.substr(from, awaitingSize);
          const chunk = await this._base64ToArrayBuffer(base64Chunk);
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

  public async toBase64(
    value: ArrayBuffer | Uint8Array | Buffer | Blob | string
  ): Promise<string> {
    const awaitingSize = this.awaitingSize;
    if (typeof value === "string") {
      value = await this.toUint8Array(value, "Text");
    } else if (isBuffer(value)) {
      const chunks: string[] = [];
      for (
        let start = 0, end = value.byteLength;
        start < end;
        start += awaitingSize
      ) {
        const buf = value.slice(start, start + awaitingSize);
        const chunk = await this._bufferToBase64(buf);
        chunks.push(chunk);
      }
      return chunks.join("");
    }

    const u8 = await this.toUint8Array(value);
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

  public async toBlob(...params: ParamsType): Promise<Blob> {
    if (!hasBlob) {
      throw new Error("Blob is not supported");
    }

    const value = params[0];
    if (!value) {
      return EMPTY_BLOB;
    }

    if (isUint8Array(value)) {
      return new Blob([await this.toArrayBuffer(value)]);
    }
    if (isArrayBuffer(value)) {
      return new Blob([value]);
    }
    if (typeof value === "string") {
      const encoding = params[1] as EncodingType;
      return new Blob([await this.toArrayBuffer(value, encoding)]);
    }

    return value;
  }

  public async toBuffer(...params: ParamsType): Promise<Buffer> {
    if (!hasBuffer) {
      throw new Error("Buffer is not suppoted.");
    }

    const value = params[0];
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
      return Buffer.from(await this.toArrayBuffer(value));
    }
    if (typeof value === "string") {
      const encoding = params[1];
      if (encoding === "Text") {
        const u8 = await this._textToUint8Array(value);
        return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength);
      } else {
        const awaitingSize = this.awaitingSize;
        let byteLength = 0;
        const chunks: Buffer[] = [];
        for (
          let start = 0, end = value.length;
          start < end;
          start += awaitingSize
        ) {
          const base64 = value.slice(start, start + awaitingSize);
          const chunk = await this._base64ToBuffer(base64);
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

  public async toText(
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

    const u8 = await (typeof value === "string"
      ? this.toUint8Array(value, "Base64")
      : this.toUint8Array(value));
    return this._uint8ArrayToText(u8);
  }

  public async toUint8Array(...params: ParamsType): Promise<Uint8Array> {
    let value = params[0];
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
      return new Uint8Array(await this.toArrayBuffer(value));
    }
    if (typeof value === "string") {
      const encoding = params[1];
      if (encoding === "Text") {
        return await this._textToUint8Array(value);
      } else {
        return new Uint8Array(await this._base64ToArrayBuffer(value));
      }
    }

    return new Uint8Array(value);
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

  protected async _blobToArrayBuffer(blob: Blob) {
    if (blob.size === 0) {
      return new ArrayBuffer(0);
    }

    const awaitingSize = this.awaitingSize;
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
    return u8.buffer;
  }

  protected async _blobToBase64(blob: Blob): Promise<string> {
    if (blob.size === 0) {
      return "";
    }

    const awaitingSize = this.awaitingSize;
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

  protected async _bufferToBase64(buffer: Buffer) {
    return buffer.toString("base64");
  }

  protected async _uint8ArrayToText(u8: Uint8Array) {
    return textDecoder.decode(u8);
  }

  private async _textToUint8Array(text: string) {
    return textEncoder.encode(text);
  }
}
