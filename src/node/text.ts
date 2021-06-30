import * as text from "../util/text";
import { isBuffer } from "./buffer";

export function toBase64(
  value: Buffer | ArrayBuffer | Uint8Array | string,
  encoding: "utf8" | "base64" = "utf8"
): string {
  if (isBuffer(value)) {
    return value.toString("base64");
  }

  return text.toBase64(value, encoding);
}

export function toUTF8(
  value: Buffer | ArrayBuffer | Uint8Array | string,
  encoding: "utf8" | "base64" = "utf8"
): string {
  if (isBuffer(value)) {
    return value.toString("utf8");
  }

  return text.toUTF8(value, encoding);
}
