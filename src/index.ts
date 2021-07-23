import "tslib";
import "./polyfill";
import * as core from "./core";
import * as util from "./util";
import * as node from "./node";
export default {
  ...core,
  util,
  node,
};
