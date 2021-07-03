import "tslib";
import * as TextEncodingShim from "text-encoding-shim";

if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextEncodingShim.TextDecoder;
}
if (!globalThis.TextEncoder) {
  (globalThis as any).TextEncoder = TextEncodingShim.TextEncoder;
}
