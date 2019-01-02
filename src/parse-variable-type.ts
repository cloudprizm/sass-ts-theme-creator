import { findFirst } from 'fp-ts/lib/Array'
import { or, and, pipe } from 'fp-ts/lib/function'

import { VariableType, SassVariableDescriptor } from './variable-descriptor'
import camelCase from 'camel-case'

type Predicate = (ast: SassVariableDescriptor) => boolean
type Resolver = (ast: SassVariableDescriptor) => string | boolean
export type VariableDescriptorResolver = [Predicate, Resolver]

export const isVariable: Predicate = (node) => node.type === VariableType.Variable
export const isFunction: Predicate = (node) => node.type === VariableType.Function
export const isPercent: Predicate = (node) => node.type === VariableType.Percent
export const isColor: Predicate = (node) => node.type === VariableType.Color
export const isColorFn: Predicate = (node) => node.type === VariableType.ColorFunction
export const isCSSFunction: Predicate = (node) => node.type === VariableType.NativeFunction
export const isVariableValue: Predicate = (node) => node.type === VariableType.Identifier
export const isString: Predicate = (node) => node.type === VariableType.String
export const isDimension: Predicate = (node) => node.type === VariableType.Dimension
export const isFont: Predicate = (node) => node.type === VariableType.Font
export const isNumber: Predicate = (node) => node.type === VariableType.Number
export const isVariableList: Predicate = (node) => node.type === VariableType.VariableList
export const isExpression: Predicate = (node) => node.type === VariableType.Expression
export const isArray: Predicate = (node) => node.type === VariableType.Array

export const isBooleanVariable: Predicate = (node) =>
  typeof node.value === 'boolean'

export const hasDependencies: Predicate = (node) =>
  node.dependencies && node.dependencies.length > 0 ? true : false

export const hasSingleReference: Predicate = node =>
  !node.dependencies || node.dependencies.length === 1

export const dependenciesToString: Resolver = node =>
  (node.dependencies || [])
    .map(d => camelCase(d))
    .join(',')

export const toArray: Resolver = node => `[${dependenciesToString(node)}]`
export const toSafeString: Resolver = node => `"${node.value.toString().replace(/\"/g, '\'')}"`
export const valueToString: Resolver = node => `"${node.value}"`
export const percentToString: Resolver = node => `"${node.value}%"`
export const toHexColor: Resolver = node => `"#${node.value}"`
export const toFunctionString: Resolver = node => `${node.value}(${dependenciesToString(node)})`
export const toHashMap: Resolver = node => `{${dependenciesToString(node)}}`
export const toValue: Resolver = node => Array.isArray(node.value) ? node.value.join(' ') : node.value
export const toTemplateString = (val: string | boolean) => `\`${val}\``

export const varToTemplateString: Resolver = ({ value, dependencies }) =>
  (dependencies || [])
    .reduce((str, dep) => str.replace(`$${dep}`, `\${${camelCase(dep)}}`),
      toTemplateString(Array.isArray(value) ? value.join(' ') : value))

export const replaceVariables: Resolver = ({ value, ...rest }) =>
  Array.isArray(value)
    ? value.map(val => varToTemplateString({ ...rest, value: val })).join(',')
    : varToTemplateString({ value, ...rest })

const toEvalFunction: Resolver = node => `evaluate([${replaceVariables(node)}], '${node.name}')`
const toColorFunction: Resolver = node => `color(${varToTemplateString(node)})`

const resolveVariableValue: Resolver = node =>
  ['true', 'false'].indexOf(node.value.toString()) > -1
    ? !!node.value
    : valueToString(node)

const resolvers: VariableDescriptorResolver[] = [
  [isPercent, percentToString],
  [isColor, toHexColor],
  [isDimension, valueToString],
  [and(isVariable, hasSingleReference), dependenciesToString],
  [isArray, toArray],
  [isColorFn, toColorFunction],
  [isCSSFunction, varToTemplateString],
  [isVariableValue, resolveVariableValue],
  [isFunction, toFunctionString],
  [or(isString, isFont), toSafeString],
  [isNumber, toValue],
  [isVariableList, toHashMap],
  [isExpression, toEvalFunction]
]

const camelCaseVariables =
  ({ name, value, ...descriptor }: SassVariableDescriptor): SassVariableDescriptor => ({
    name: camelCase(name),
    value: typeof value === 'string' ? value.trim() : value,
    ...descriptor
  })

const resolveValueWith = (resolver: Resolver) =>
  (descriptor: SassVariableDescriptor): SassVariableDescriptor => ({
    ...descriptor,
    value: resolver(descriptor),
  })

export const toConstDescriptor = (declaration: SassVariableDescriptor) =>
  findFirst(resolvers, ([p]) => p(declaration))
    .map(([_, toString]) => pipe(
      camelCaseVariables,
      resolveValueWith(toString)
    )(declaration))
    .map(({ dependencies, ...descriptor }) => ({
      ...descriptor,
      // INFO it have to happen after resolving a value, since before rawStrings expect sneak-form
      dependencies: dependencies ? dependencies.map(d => camelCase(d)) : [],
    }))