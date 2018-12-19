import compile from "../compile";
import { resolve } from "path";
import { expect } from "chai";
import { Opts as PathTransformOpts } from "../src";
import { readFile } from "fs-extra";

const opts: PathTransformOpts = {
  verbose: true
};

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
          'import * as React from "react";\nvar hoisted_constant_element_1 = React.createElement("img", { src: "", hidden: false, width: 1, srcSet: "test 200px" });'
        );
      }
    );
  });

  it("should hoist multiple constant elements", function() {
    compile(resolve(__dirname, "fixture/MultipleConstantEl.tsx"), opts);
    return readFile(
      resolve(__dirname, "fixture/MultipleConstantEl.js"),
      "utf8"
    ).then(content => {
      expect(content).to.equal(`import * as React from "react";
var hoisted_constant_element_1 = React.createElement("img", { src: "", hidden: false, width: 1, srcSet: "test 200px" });
var hoisted_constant_element_2 = React.createElement("br", null);
var hoisted_constant_element_3 = React.createElement("img", { src: "", hidden: true, width: 1, srcSet: "test 200px" });
export function Foo(props) {
    return (React.createElement("div", { className: props.className },
        hoisted_constant_element_1,
        hoisted_constant_element_2,
        hoisted_constant_element_3));
}
`);
    });
  });
});
