import { Converter, hasBlob, hasBuffer } from "../util/conv";

const c = new Converter();

test("util/binary ArrayBuffer", async () => {
  const expected = "大谷翔平ホームラン";
  const ab = await c.toArrayBuffer(expected, "Text");

  {
    const actual = await c.toText(ab);
    expect(actual).toBe(expected);
  }

  {
    const u8 = await c.toUint8Array(ab);
    const actual = await c.toText(u8);
    expect(actual).toBe(expected);
  }

  if (hasBlob) {
    const blob = await c.toBlob(ab);
    const actual = await c.toText(blob);
    expect(actual).toBe(expected);
  }

  if (hasBuffer) {
    const buf = await c.toBuffer(ab);
    const actual = await c.toText(buf);
    expect(actual).toBe(expected);
  }

  {
    const base64 = await c.toBase64(ab);
    const actual = await c.toText(base64, "Base64");
    expect(actual).toBe(expected);
  }
});

test("util/binary Uint8Array", async () => {
  const expected = "大谷翔平ホームラン";
  const u8 = await c.toUint8Array(expected, "Text");

  {
    const actual = await c.toText(u8);
    expect(actual).toBe(expected);
  }

  {
    const ab = await c.toArrayBuffer(u8);
    const actual = await c.toText(ab);
    expect(actual).toBe(expected);
  }

  if (hasBlob) {
    const blob = await c.toBlob(u8);
    const actual = await c.toText(blob);
    expect(actual).toBe(expected);
  }

  if (hasBuffer) {
    const buf = await c.toBuffer(u8);
    const actual = await c.toText(buf);
    expect(actual).toBe(expected);
  }

  {
    const base64 = await c.toBase64(u8);
    const actual = await c.toText(base64, "Base64");
    expect(actual).toBe(expected);
  }
});

test("util/binary Buffer", async () => {
  if (!hasBuffer) {
    return;
  }

  const expected = "大谷翔平ホームラン";
  const buffer = await c.toBuffer(expected, "Text");

  {
    const actual = await c.toText(buffer);
    expect(actual).toBe(expected);
  }

  {
    const ab = await c.toArrayBuffer(buffer);
    const actual = await c.toText(ab);
    expect(actual).toBe(expected);
  }

  {
    const u8 = await c.toUint8Array(buffer);
    const actual = await c.toText(u8);
    expect(actual).toBe(expected);
  }

  if (hasBlob) {
    const blob = await c.toBlob(buffer);
    const actual = await c.toText(blob);
    expect(actual).toBe(expected);
  }

  {
    const base64 = await c.toBase64(buffer);
    const actual = await c.toText(base64, "Base64");
    expect(actual).toBe(expected);
  }
});

test("util/binary Base64", async () => {
  if (!hasBlob) {
    return;
  }

  const expected = "大谷翔平ホームラン";
  const base64 = await c.toBase64(expected, "Text");

  {
    const actual = await c.toText(base64, "Base64");
    expect(actual).toBe(expected);
  }

  {
    const ab = await c.toArrayBuffer(base64, "Base64");
    const actual = await c.toText(ab);
    expect(actual).toBe(expected);
  }

  {
    const u8 = await c.toUint8Array(base64, "Base64");
    const actual = await c.toText(u8);
    expect(actual).toBe(expected);
  }

  if (hasBlob) {
    const blob = await c.toBlob(base64, "Base64");
    const actual = await c.toText(blob);
    expect(actual).toBe(expected);
  }

  if (hasBuffer) {
    const buf = await c.toBuffer(base64, "Base64");
    const actual = await c.toText(buf);
    expect(actual).toBe(expected);
  }
});
