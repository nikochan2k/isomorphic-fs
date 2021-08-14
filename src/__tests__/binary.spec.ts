import {
  hasBlob,
  hasBuffer,
  toArrayBuffer,
  toBlob,
  toBuffer,
  toUint8Array,
} from "../util/binary";
import { toBase64, toText } from "../util/text";

test("util/binary ArrayBuffer", async () => {
  const expected = "大谷翔平ホームラン";
  const ab = await toArrayBuffer(expected, "utf8");

  {
    const actual = await toText(ab);
    expect(actual).toBe(expected);
  }

  {
    const u8 = await toUint8Array(ab);
    const actual = await toText(u8);
    expect(actual).toBe(expected);
  }

  if (hasBlob) {
    const blob = await toBlob(ab);
    const actual = await toText(blob);
    expect(actual).toBe(expected);
  }

  if (hasBuffer) {
    const buf = await toBuffer(ab);
    const actual = await toText(buf);
    expect(actual).toBe(expected);
  }

  {
    const base64 = await toBase64(ab);
    const actual = await toText(base64);
    expect(actual).toBe(expected);
  }
});

test("util/binary Uint8Array", async () => {
  const expected = "大谷翔平ホームラン";
  const u8 = await toUint8Array(expected);

  {
    const actual = await toText(u8);
    expect(actual).toBe(expected);
  }

  {
    const ab = await toArrayBuffer(u8);
    const actual = await toText(ab);
    expect(actual).toBe(expected);
  }

  if (hasBlob) {
    const blob = await toBlob(u8);
    const actual = await toText(blob);
    expect(actual).toBe(expected);
  }

  if (hasBuffer) {
    const buf = await toBuffer(u8);
    const actual = await toText(buf);
    expect(actual).toBe(expected);
  }

  {
    const base64 = await toBase64(u8);
    const actual = await toText(base64);
    expect(actual).toBe(expected);
  }
});

test("util/binary Buffer", async () => {
  if (!hasBuffer) {
    return;
  }

  const expected = "大谷翔平ホームラン";
  const buffer = await toBuffer(expected);

  {
    const actual = await toText(buffer);
    expect(actual).toBe(expected);
  }

  {
    const ab = await toArrayBuffer(buffer);
    const actual = await toText(ab);
    expect(actual).toBe(expected);
  }

  {
    const u8 = await toUint8Array(buffer);
    const actual = await toText(u8);
    expect(actual).toBe(expected);
  }

  if (hasBlob) {
    const blob = await toBlob(buffer);
    const actual = await toText(blob);
    expect(actual).toBe(expected);
  }

  {
    const base64 = await toBase64(buffer);
    const actual = await toText(base64);
    expect(actual).toBe(expected);
  }
});

test("util/binary Base64", async () => {
  if (!hasBlob) {
    return;
  }

  const expected = "大谷翔平ホームラン";
  const base64 = await toBase64(expected);

  {
    const actual = await toText(base64);
    expect(actual).toBe(expected);
  }

  {
    const ab = await toArrayBuffer(base64, "base64");
    const actual = await toText(ab);
    expect(actual).toBe(expected);
  }

  {
    const u8 = await toUint8Array(base64, "base64");
    const actual = await toText(u8);
    expect(actual).toBe(expected);
  }

  if (hasBlob) {
    const blob = await toBlob(base64, "base64");
    const actual = await toText(blob);
    expect(actual).toBe(expected);
  }

  if (hasBuffer) {
    const buf = await toBuffer(base64, "base64");
    const actual = await toText(buf);
    expect(actual).toBe(expected);
  }
});
