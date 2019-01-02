import { uniq, findFirst } from 'fp-ts/lib/Array'
import { setoidString } from 'fp-ts/lib/Setoid'
import { and, not, or } from 'fp-ts/lib/function'

import {
  toConstDescriptor,
  isNumber,
  isVariableValue,
  isString,
  isArray,
  hasSingleReference,
  isVariable,
  isVariableList,
  isBooleanVariable,
  hasDependencies,
  VariableDescriptorResolver
} from './parse-variable-type'
import { SassVariableDescriptor, VariableType } from './variable-descriptor'

const uniqString = uniq(setoidString)

const makeConstString =
  (name: string, value: string) =>
    `const ${name} = ${value}`

const makeConstStringAndAllowOverrding =
  ({ name, value }: SassVariableDescriptor, attachTo: string) =>
    makeConstString(name, `${attachTo}.${name} || ${value}`)

const makeTypeString =
  (name: string, value: string) =>
    `export type ${name} = ${value}`

const exportAsObjectType =
  (name: string, value: string) =>
    `{${name}: ${value}}`

const toUnionType = (vars: string[]) =>
  vars.map(d => `"${d}"`).join('|')

const toExportedUnionType = (varName: string, vars: string[]) =>
  makeTypeString(varName, toUnionType(vars))

const toRecordType =
  (value: string, keys: string[]) =>
    `Record<${toUnionType(keys)}, ${value}>`

const toArrayType = (value: string) =>
  `Array<${value}>`

const getVariableByName = (variables: SassVariableDescriptor[], varName: string) =>
  findFirst(variables, d => d.name === varName)

const typeLookup = (variables: SassVariableDescriptor[], varName: string) =>
  getVariableByName(variables, varName)
    .map(d => d.type)
    .toNullable()

const stringifiedTypes = [
  VariableType.Color,
  VariableType.ColorFunction,
  VariableType.Dimension,
  VariableType.Function,
  VariableType.String,
  VariableType.NativeFunction,
  VariableType.Identifier,
  VariableType.Expression,
  VariableType.Font,
]

type Predicate = VariableDescriptorResolver['0']
type Resolver = (variable: SassVariableDescriptor, lookup: SassVariableDescriptor[]) => string
export type TSTypeResolver = [Predicate, Resolver]

type TypeCaster = (val: string, dependencies: string[]) => string

const containerTypeResolver =
  (typeCaster: TypeCaster): Resolver =>
    (variable, variables) => {
      const dependencies = variable.dependencies as string[]
      const dependencyType = typeLookup(variables, dependencies[0]) || VariableType.String
      const contentType =
        stringifiedTypes.indexOf(dependencyType) > -1
          ? variable.innerType || 'string'
          : dependencyType

      return exportAsObjectType(variable.name, typeCaster(contentType, dependencies))
    }

const variableListToRecord: Resolver = containerTypeResolver(toRecordType)
const arrayToType: Resolver = containerTypeResolver(toArrayType)

const boolToType: Resolver = (variable) =>
  exportAsObjectType(variable.name, 'boolean')

const numberToType: Resolver = (variable) =>
  exportAsObjectType(variable.name, 'number')

const lookDeeper =
  (variables: SassVariableDescriptor[], variable?: SassVariableDescriptor): VariableType => {
    if (variable && isVariable(variable) && hasSingleReference(variable)) {
      const dependencies = variable.dependencies as string[]
      const dependencyName = dependencies[0]
      return lookDeeper(variables, getVariableByName(variables, dependencyName).toUndefined())
    }
    return variable ? variable.type : VariableType.String
  }

const checkReferencedType: Resolver = (variable, variables) => {
  const referenceType = lookDeeper(variables, variable)
  return stringifiedTypes.indexOf(referenceType) === -1
    ? referenceType
    : VariableType.String
}

const typesWithSpecialTreatment: TSTypeResolver[] = [
  [and(isVariableList, hasDependencies), variableListToRecord],
  [and(isArray, hasDependencies), arrayToType],
  [and(isVariableValue, isBooleanVariable), boolToType],
  [isNumber, numberToType],
]

const isNotAStringType =
  (variable: SassVariableDescriptor, variables: SassVariableDescriptor[]) =>
    findFirst(typesWithSpecialTreatment, ([p]) => p(variable))

const resolveTSType = (variables: SassVariableDescriptor[]) => (variable: SassVariableDescriptor) =>
  isNotAStringType(variable, variables)
    .map(([_, toType]) => toType(variable, variables))

const prepareTypeOverriding = (variables: SassVariableDescriptor[]) =>
  variables
    .filter(not(isString))
    .map(resolveTSType(variables))
    .map(d => d.toNullable())
    .filter(Boolean)
    .join('&')

const prepareVariablesAsConst = (variables: SassVariableDescriptor[], attachTo: string) =>
  variables.map(d =>
    or(isVariableList, isArray)(d)
      ? makeConstString(d.name, d.value as string)
      : makeConstStringAndAllowOverrding(d, attachTo)
  )

const prepareMethodToInject = (variables: SassVariableDescriptor[]) => {
  const closureDeps = variables.reduce((acc, d) => acc.concat(d.fnsToCall || []), [] as string[])
  const injectedMethods = uniqString(closureDeps)
  const shouldInjectAnything = injectedMethods.length > 0

  const injectedMethodAsArgs = shouldInjectAnything
    ? `{${injectedMethods.join(',')}}: InjectedMethods`
    : ''

  const injectedMethodsType = `
    ${shouldInjectAnything ? toExportedUnionType('Methods', injectedMethods) : ''}
    ${shouldInjectAnything ? `export type InjectedMethods = 
      Record<Methods, (val: string | string[], src?: string) => string>
    ` : ''}
  `

  return [
    injectedMethodAsArgs || '',
    injectedMethodsType
  ]
}

export const makeFunction = (sortedSassVariables: SassVariableDescriptor[]) => {
  const variableDescriptors = sortedSassVariables
    .map(toConstDescriptor)
    .map(d => d.toNullable())
    .filter(Boolean) as SassVariableDescriptor[]

  if (variableDescriptors.length === 0) return ''

  const attachTo = 'overriding'
  const allVariablesToExport = variableDescriptors.map(d => d.name)
  const withResolvedTypes = variableDescriptors
    .map(d => ({
      ...d,
      type: d.type === VariableType.Variable
        ? checkReferencedType(d, variableDescriptors)
        : d.type
    })) as SassVariableDescriptor[]
  const variablesAsConst = prepareVariablesAsConst(variableDescriptors, attachTo)
  const typesOverriding = prepareTypeOverriding(withResolvedTypes)
  const onlyStringTypes = withResolvedTypes
    .filter(d => isNotAStringType(d, withResolvedTypes).isNone())
    .map(d => d.name)
  const hasStringTypes = onlyStringTypes.length > 0

  const [
    injectedMethodsAsArgs,
    injectedMethodsType
  ] = prepareMethodToInject(variableDescriptors)

  return `
    ${injectedMethodsType}
    ${hasStringTypes ? toExportedUnionType('BulmaVars', onlyStringTypes) : ''}
    export type BulmaTheme = ${[hasStringTypes && 'Record<BulmaVars, string>', typesOverriding].filter(Boolean).join('&')}

    export const makeBasicTheme = (${injectedMethodsAsArgs}) => (${attachTo}: Partial<BulmaTheme>): BulmaTheme => {
      ${variablesAsConst.join('\n')}
      return {
        ${allVariablesToExport.join(',\n')}
      }
    }
  `
}