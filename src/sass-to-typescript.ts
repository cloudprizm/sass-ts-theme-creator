import { format as prettier, Options, BuiltInParserName } from 'prettier'
import { makeFunction } from './sass-to-typescript-template'
import { parse } from './parse-sass'

const defaultFormat = {
  semi: false,
  singleQuote: true,
  parser: 'typescript' as BuiltInParserName
}

export type PrettierOptions = Options

export const sassToTypescript =
  (file: string, prettierOptions: PrettierOptions = defaultFormat) =>
    prettier(
      makeFunction(parse(file)),
      prettierOptions
    )