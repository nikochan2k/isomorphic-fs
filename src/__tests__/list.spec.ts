import { NodeFileSystem } from "../node/NodeFileSystem";
import { getRootDir } from "./init";
import { testAll } from "./list";

const fs = new NodeFileSystem(getRootDir());
testAll(fs);
