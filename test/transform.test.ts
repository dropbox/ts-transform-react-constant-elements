import compile from "../compile";
import { resolve } from "path";
import { expect } from "chai";
import { Opts as PathTransformOpts } from "../src";
import { readFile } from "fs-extra";

const opts: PathTransformOpts = {};

describe("transformer", function() {
  this.timeout(5000);

  it("should hoist empty el", function() {
    compile(resolve(__dirname, "fixture/EmptyEl.tsx"), opts);
    return readFile(resolve(__dirname, "fixture/EmptyEl.js"), "utf8").then(
      content => {
        expect(content).to.contain(
          'return (React.createElement("div", { className: props.className }, hoisted_constant_element_1))'
        );
        expect(content).to.contain(
          'import * as React from "react";\nvar hoisted_constant_element_1 = React.createElement("br", null);'
        );
      }
    );
  });

  it("should hoist el with primitive attributes", function() {
    compile(resolve(__dirname, "fixture/ConstantEl.tsx"), opts);
    return readFile(resolve(__dirname, "fixture/ConstantEl.js"), "utf8").then(
      content => {
        expect(content).to.contain(
          'return (React.createElement("div", { className: props.className }, hoisted_constant_element_1))'
        );
        expect(content).to.contain(
          'import * as React from "react";\nvar hoisted_constant_element_1 = React.createElement("br", null);'
        );
      }
    );
  });
});
