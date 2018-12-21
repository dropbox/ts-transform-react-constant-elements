// tslint:disable:no-console
import * as ts from "typescript";

const REACT_REGEX = /['"]react['"]/;

/**
 * Check if node is a prologue directive (e.g "use strict")
 * @param node node to check
 * @returns {boolean} true if it is, false otherwise
 */
function isNotPrologueDirective(node: ts.Node): boolean {
  return (
    !ts.isExpressionStatement(node) || !ts.isStringLiteral(node.expression)
  );
}

/**
 * Check if this node is a import react node
 *
 * @param {ts.Node} node node
 * @param {ts.SourceFile} sf source file to get text from
 * @returns {boolean} true if it is, false otherwise
 */
function isReactImport(node: ts.Node, sf: ts.SourceFile): boolean {
  return (
    ts.isImportDeclaration(node) &&
    REACT_REGEX.test(node.moduleSpecifier.getText(sf))
  );
}

/**
 * Check if an attribute is mutable (having non-primitive values)
 *
 * @param {ts.JsxAttributeLike} attr attribute
 * @returns {boolean} true if mutable, false otherwise
 */
function isMutableProp(attr: ts.JsxAttributeLike): boolean {
  // {...props} spread operator's definitely mutable
  if (ts.isJsxSpreadAttribute(attr)) {
    return true;
  }
  const { initializer } = attr;
  // cases like <button enabled />
  if (!initializer) {
    return false;
  }
  // foo="bar"
  if (ts.isStringLiteral(initializer)) {
    return false;
  }

  if (ts.isJsxExpression(initializer)) {
    const { expression } = initializer;
    if (
      // foo={true}
      expression.kind === ts.SyntaxKind.TrueKeyword ||
      // foo={false}
      expression.kind === ts.SyntaxKind.FalseKeyword ||
      // foo={1}
      ts.isNumericLiteral(expression) ||
      // foo={"asd"}
      ts.isStringLiteral(expression)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Check if element is considered a constant element
 *
 * @param {ts.Node} el element to check
 * @returns {boolean}
 */
function isConstantElement(
  el: ts.Node
): el is ts.JsxSelfClosingElement & boolean {
  // We only handle self-closing el for now
  // e.g: <img src="foo"/>
  // TODO: We can support immutable children but later
  if (!ts.isJsxSelfClosingElement(el)) {
    return false;
  }

  // No attributes, e.g <br/>
  return (
    !el.attributes ||
    !el.attributes.properties ||
    !el.attributes.properties.length ||
    // no mutable prop
    !el.attributes.properties.find(isMutableProp)
  );
}

/**
 * Visit nodes recursively and try to determine if node's
 * considered a constant node.
 * NOTE: This modifies hoistedVariables inline
 *
 * @param {ts.TransformationContext} ctx transformation context
 * @param {HoistedVariables} hoistedVariables hoistedVariables to populate
 * @returns {ts.Visitor}
 */
function constantElementVisitor(
  ctx: ts.TransformationContext,
  hoistedVariables: ts.VariableStatement[]
): ts.Visitor {
  const visitor: ts.Visitor = node => {
    if (isConstantElement(node)) {
      const variable = ts.createUniqueName("hoisted_constant_element");
      const statement = ts.createVariableStatement(
        undefined,
        ts.createVariableDeclarationList([
          ts.createVariableDeclaration(variable, undefined, node)
        ])
      );
      // Store the variable assignement to hoist later
      hoistedVariables.push(statement);

      // Replace <foo /> with {hoisted_constant_element_1}
      // TODO: Figure out case like `return <foo />
      return ts.createJsxExpression(undefined, variable);
    }
    return ts.visitEachChild(node, visitor, ctx);
  };
  return visitor;
}

function visitSourceFile(
  ctx: ts.TransformationContext,
  sf: ts.SourceFile,
  opts?: Opts
): ts.SourceFile {
  /**
   * Find the 1st node that we can inject hoisted variable. This means:
   * 1. Pass the prologue directive
   * 2. Pass shebang (not a node)
   * 3. Pass top level comments (not a node)
   * 4. Pass React import (bc hoisted var uses React)
   */
  const firstHoistableNodeIndex = sf.statements.findIndex(
    node => isNotPrologueDirective(node) && isReactImport(node, sf)
  );
  // Can't find where to hoist
  if (!~firstHoistableNodeIndex) {
    return sf;
  }

  const hoistedVariables: ts.VariableStatement[] = [];
  const elVisitor = constantElementVisitor(ctx, hoistedVariables);

  // We assume we only care about nodes after React import
  const transformedStatements = sf.statements
    .slice(firstHoistableNodeIndex + 1, sf.statements.length)
    .map(node => ts.visitNode(node, elVisitor));
  if (opts.verbose) {
    console.log(
      `Hoisting ${hoistedVariables.length} elements in ${sf.fileName}:`
    );
    hoistedVariables.forEach(n =>
      console.log(n.declarationList.declarations[0].initializer.getText(sf))
    );
  }

  return ts.updateSourceFileNode(
    sf,
    ts.setTextRange(
      ts.createNodeArray([
        ...sf.statements.slice(0, firstHoistableNodeIndex + 1),
        // Inject hoisted variables
        ...hoistedVariables,
        ...transformedStatements
      ]),
      sf.statements
    )
  );
}

export interface Opts {
  verbose?: boolean;
}

export function transform(
  opts: Opts = {}
): ts.TransformerFactory<ts.SourceFile> {
  return ctx => sf => visitSourceFile(ctx, sf, opts);
}
