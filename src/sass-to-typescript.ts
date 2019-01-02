import { format } from 'prettier'
import { makeFunction } from './sass-to-typescript-template'
import { parse } from './parse-sass'

export const sassToTypescript = (file: string) =>
  format(
    makeFunction(
      parse(file)),
    { semi: true, parser: 'typescript' })