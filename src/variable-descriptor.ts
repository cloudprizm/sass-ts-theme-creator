export enum VariableType {
  ColorFunction = 'color-fn',
  Color = 'color',
  Percent = 'percentage',
  NativeFunction = 'native-function',
  Function = 'function',
  Variable = 'variable',
  Array = 'array',
  Identifier = 'ident',
  String = 'string',
  Font = 'font',
  Dimension = 'dimension',
  Number = 'number',
  VariableList = 'variableList',
  Expression = 'expression',
}

export interface SassVariableDescriptor {
  name: string
  value: string | boolean | string[]
  type: VariableType
  innerType?: VariableType
  fnsToCall?: string[]
  dependencies?: string[]
}

export const makeVariableDescriptor =
  ({ name, value, fnsToCall, dependencies, type }: SassVariableDescriptor): SassVariableDescriptor => ({
    name,
    value,
    type,
    fnsToCall: fnsToCall || [],
    dependencies: dependencies || [],
  })