import sass from 'node-sass'
import fs from 'fs'
import { sassToTypescript, PrettierOptions } from './sass-to-typescript'

interface NodeSassOptions {
  file: string
  includePaths: string[]
}

export const getAllFilesFromEntryPoint =
  (options: NodeSassOptions) => {
    const sassRenderResult = sass.renderSync(options)
    return sassRenderResult
      .stats
      .includedFiles
      .map((d: string) => fs.readFileSync(d, 'utf-8'))
      .join('\n')
  }

export const parseFile =
  (sassOptions: NodeSassOptions, prettierOptions?: PrettierOptions) =>
    sassToTypescript(
      getAllFilesFromEntryPoint(sassOptions),
      prettierOptions
    )