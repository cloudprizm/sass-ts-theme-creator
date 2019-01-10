import { findFirst, flatten, uniq } from 'fp-ts/lib/Array'
import { setoidString } from 'fp-ts/lib/Setoid'

const uniqString = uniq(setoidString)

import {
  getASTVariableId,
  AST,
  WrappedNode,
  getVariableName,
  getFirstValueFromType,
  getValuesForType,
  nodeToString,
  getASTFunction,
  variableToString,
  nodeFromQueryToString,
  getInterpolationAST,
} from './sass-ast'

import { SassVariableDescriptor, VariableType } from './variable-descriptor'

export const cssFunctions = ['calc']
export const colorFunctions = ['rgb', 'hsl', 'rgba']

type Predicate = (ast: AST) => boolean

type Resolver = (ast: AST) =>
  & Partial<SassVariableDescriptor>
  & Required<Pick<SassVariableDescriptor, 'name' | 'type'>>

export type SassTypeResolver = [Predicate, Resolver]

const when =
  (type: VariableType) =>
    (ast: AST) =>
      !!getFirstValueFromType(type, ast)

const getVarNameAndValue =
  (type: VariableType, ast: AST): Pick<SassVariableDescriptor, 'name' | 'value'> => ({
    name: getVariableName(ast),
    value: getFirstValueFromType(type, ast),
  })

const then =
  (type: VariableType) =>
    (ast: AST) => ({ type, ...getVarNameAndValue(type, ast) })

export const getColorValue: SassTypeResolver = [
  when(VariableType.Color),
  then(VariableType.Color)
]

export const getDimensionValue: SassTypeResolver = [
  when(VariableType.Dimension),
  then(VariableType.Dimension)
]

export const getPercentValue: SassTypeResolver = [
  when(VariableType.Percent),
  then(VariableType.Percent),
]

export const getNumberValue: SassTypeResolver = [
  when(VariableType.Number),
  then(VariableType.Number)
]

export const getIdentValue: SassTypeResolver = [
  when(VariableType.Identifier),
  then(VariableType.Identifier)
]

const getVariables = (ast: AST) =>
  getValuesForType(VariableType.Variable, ast)
    .children('ident')

export const getVariablesArray: SassTypeResolver = [
  ast => getVariables(ast).length() > 1,
  ast => ({
    name: getVariableName(ast),
    type: VariableType.Array,
    dependencies: getVariables(ast).map(nodeFromQueryToString),
  })
]

const getNumbers = (ast: AST) =>
  getValuesForType(VariableType.Number, ast)

export const getNumbersArray: SassTypeResolver = [
  ast => getNumbers(ast).length() > 1,
  ast => ({
    name: getVariableName(ast),
    type: VariableType.Array,
    innerType: VariableType.Number,
    dependencies: getNumbers(ast).map(nodeFromQueryToString),
  })
]

export const getVariableRef: SassTypeResolver = [
  when(VariableType.Variable),
  ast => ({
    name: getVariableName(ast),
    type: VariableType.Variable,
    dependencies: [getFirstValueFromType(VariableType.Variable, ast)]
  })
]

export const getVariableList: SassTypeResolver = [
  ast =>
    ast
      .children('value')
      .children()
      .children('arguments')
      .children('parentheses')
      .children('string')
      .length() > 0,
  ast => {
    const name = getVariableName(ast)
    const args = ast.children('value').children().children('arguments')
    const nestedValues = args.children('parentheses')
    // @ts-ignore
    const innerValue = nestedValues.map<string[]>(variableToString)
    const values = uniqString(flatten(innerValue)) as string[]

    return ({ name, type: VariableType.VariableList, dependencies: values })
  }
]

const getCommaSeparatedList =
  (ast: AST) =>
    ast
      .children('value')
      .first()
      .value()

export const getListOfValues: SassTypeResolver = [
  ast => ast
    .children('value')
    .children()
    .map(d => d.node.content)
    .filter(d => d === ',')
    .length > 1,
  (ast) => ({
    name: getVariableName(ast),
    type: VariableType.Expression,
    fnsToCall: ['evaluate'],
    value: getCommaSeparatedList(ast),
  }),
]

// I don't like this piece - these 2 functions are too big!
// - for v1 is good enough, but need to find a better way ... 
// would be good to recursively resolve whole expression
const spaceSeparatedValuesToArray = (children: WrappedNode[]) => {
  const spaceSeparatedValues = [] as WrappedNode[][]
  let idx = 0
  children.forEach(d => {
    if (d.node.type === 'space') idx++
    else if (d.node.content === ',') {
      idx++
      spaceSeparatedValues[idx] = [d]
    } else {
      if (spaceSeparatedValues[idx]) return spaceSeparatedValues[idx].push(d)
      spaceSeparatedValues[idx] = [d]
    }
  })
  return spaceSeparatedValues.map(d => d.map(nodeFromQueryToString).join(''))
}

export const getExpression: SassTypeResolver = [
  ast => {
    const value = ast.children('value')
    const hasDimension = value.children('dimension').length()
    const hasFunction = value.children('function').children().length()
    const hasOperator = value.children('operator').length()
    const hasNumber = value.children('number').length()
    const hasString = value.children('ident').length()
    const hasSpace = value.children('space').length()
    const hasMixedContent =
      (hasDimension > 0 && (hasString > 0 || hasNumber > 0))
      || (hasFunction > 0 && (hasString > 0 && hasNumber > 0))
      || hasDimension > 1
      || hasOperator > 0
    return hasSpace > 0 && hasMixedContent
  },
  ast => {
    const expression = ast.children('value')
    const varName = getVariableName(ast)
    // const rawExpression = nodeToString(expression.get(0))
    const args = expression
      .children('variable')
      .children()
      .map(nodeFromQueryToString)

    const functionArgs = expression
      .children('function')
      .children('arguments')
      .children('variable')
      .children('ident')
      .map(nodeFromQueryToString)

    const nestedArgs = expression
      .children()
      .children('variable')
      .children()
      .map(nodeFromQueryToString)

    // this is not a normal split - tempting would be to do a split with space, but
    // inner methods have spaces and commas - this only breaks top level
    // i.e. 0 8px 8px rgba($black, 0.1) -> [0, 8px, 8px, rgba(${black}, 0.1)]
    const valuesToArray = spaceSeparatedValuesToArray(expression.children().nodes)
    return ({
      name: varName,
      type: VariableType.Expression,
      value: valuesToArray,
      fnsToCall: ['evaluate'],
      dependencies: args.concat(nestedArgs).concat(functionArgs)
    })
  },
]

const getASTVariableFromFnArgs = (ast: AST) =>
  ast
    .children('arguments')
    .children('variable')
    .children('ident')

export const getFunction: SassTypeResolver = [
  ast =>
    getASTFunction(ast)
      .children()
      .length() > 0,
  (ast) => {
    const fnAST = getASTFunction(ast)
    const varName = getVariableName(ast)
    const fnName = getASTVariableId(fnAST)
    const variableArguments = getASTVariableFromFnArgs(fnAST).map(nodeFromQueryToString)
    const interpolationArguments = getInterpolationAST(fnAST).map(nodeFromQueryToString)

    if (cssFunctions.indexOf(fnName) > -1) {
      const rawValue = nodeToString(fnAST.get(0))
      return ({
        name: varName,
        type: VariableType.NativeFunction,
        // INFO from js perspective this does not matter as it is wrapped by template string
        value: rawValue.replace(/[#\{\}]/g, ''),
        // fnsToCall: [fnName],
        dependencies: variableArguments.concat(interpolationArguments)
      })
    }

    if (colorFunctions.indexOf(fnName) > -1) {
      const rawValue = nodeToString(fnAST.get(0))
      return ({
        name: varName,
        type: VariableType.ColorFunction,
        value: rawValue,
        fnsToCall: ['color'],
        dependencies: variableArguments
      })
    }

    return ({
      name: varName,
      type: VariableType.Function,
      value: fnName,
      fnsToCall: [fnName],
      dependencies: variableArguments
    })
  }
]

const possibleValues: SassTypeResolver[] = [
  getVariableList,
  // getListOfValues,
  getExpression,
  getNumbersArray,
  getFunction,
  getIdentValue,
  getColorValue,
  getPercentValue,
  getNumberValue,
  getDimensionValue,
  getVariablesArray,
  getVariableRef,
]

export const parseASTVariable = (declaration: AST) =>
  findFirst(possibleValues, ([p]) => p(declaration))
    .map(([_, makeDescriptor]) => makeDescriptor(declaration))