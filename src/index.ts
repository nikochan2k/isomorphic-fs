import "tslib";
import "./polyfill";
const core = import("./core");
const util = import("./util");
const node = import("./node");
export default {
  ...core,
  util,
  node,
};
