import parseTree, { Node, Options } from 'gonzales-pe'
import createQueryWrapper, { ASTWrapperOptions, NodeWrapper, QueryWrapper } from 'query-ast'
import { VariableType } from './variable-descriptor'

export type ASTNode = Node
export type AST = QueryWrapper<ASTNode>
export type WrappedNode = NodeWrapper<ASTNode>

export const nodeToString = (node: Node) => parseTree.createNode(node).toString()
export const nodeFromQueryToString = (d: WrappedNode) => nodeToString(d.node)
export const astToJSON = (ast: Node): JSON => JSON.parse(ast.toJson())

const queryASTOptions: ASTWrapperOptions<Node> = {
  hasChildren: (node) => Array.isArray(node.content),
  getChildren: (node) => node.content,
  getType: (node) => node.type,
  toJSON: (node, children) => ({
    ...node,
    content: children ? children : node.content
  }),
  toString: (node) =>
    typeof node.content === 'string'
      ? node.content
      : ''
}

export const createASTTraverser = (ast: Node) =>
  createQueryWrapper(astToJSON(ast), queryASTOptions)

export const makeTraversibleASTPart = (node: Node) =>
  createASTTraverser(parseTree.createNode(node))

const astTypesToDrop = [
  'default',
  // 'space',
  'comment',
  'atrule',
  'attributeSelector',
  'attributeMatch', // =
  'mixin',
  'ruleset',
  'multilineComment',
  'singlelineComment',
  'propertyDelimiter'
]

// TODO syntax should be customized as well as template
export const getAST = (syntax: Options['syntax']) => (sassTextFile: string, ) => {
  const ast = parseTree.parse(sassTextFile, { syntax, start: false, end: false })
  ast.traverseByTypes(astTypesToDrop, (_, index, parent) => parent.removeChild(index))
  return ast
}

export const getASTVariableId = (ast: AST) =>
  ast
    .children('ident')
    .first()
    .value()

export const getValuesForType =
  (type: VariableType, ast: AST) =>
    ast
      .children('value')
      .children(type)

export const getFirstValueFromType =
  (type: VariableType, ast: AST) =>
    getValuesForType(type, ast)
      .first()
      .value()

export const variableToString = (d: AST) =>
  makeTraversibleASTPart(d.node)('variable')
    .children('ident')
    .map(nodeFromQueryToString)

export const getVariableName = (ast: AST) =>
  getASTVariableId(
    ast
      .children('property')
      .children('variable')
  )

export const getASTFunction = (ast: AST) =>
  ast
    .children('value')
    .children('function')

export const getInterpolationAST = (ast: AST) =>
  ast
    .children('arguments')
    .children('interpolation')
    .children('variable')
    .children('ident')