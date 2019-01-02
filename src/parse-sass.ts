import toposort from 'toposort-object'
import { range } from 'fp-ts/lib/Array'
import { reader, asks } from 'fp-ts/lib/Reader'

import { parseASTVariable } from './sass-type-resolver'
import { SassVariableDescriptor } from './variable-descriptor'
import { getAST, createASTTraverser, makeTraversibleASTPart, AST, ASTNode } from './sass-ast'

interface Configuration {
  parser: (sassFile: string) => ASTNode
}

const sortDescriptors = (descriptors: SassVariableDescriptor[]) => {
  const namesWithDependencies = descriptors
    .map(d => ({ [d.name]: d.dependencies || [] }))
    .reduce((acc, d) => ({ ...acc, ...d }), {})

  const order = toposort(namesWithDependencies, true)

  return descriptors
    .sort((a, b) =>
      order.indexOf(a.name) > order.indexOf(b.name) ? 1 : -1) // double check that
}

export const toAST = (sassFile: string) =>
  reader
    .of<Configuration, string>(sassFile)
    .chain(file => asks(e => e.parser(file)))
    .map(ast => createASTTraverser(ast))
    .map(traverser => traverser('property'))

// INFO property is on the left side but here I need full to get var value and var name
const getFullExpressionFromParentPerspective =
  (declarations: AST, index: number) =>
    makeTraversibleASTPart(declarations.parent().get(index))() as AST

export const toVariableDescriptors = (sassFile: string) =>
  toAST(sassFile)
    .map(declarations =>
      range(0, declarations.length() - 1)
        .map((_, i) => getFullExpressionFromParentPerspective(declarations, i))
        .map(parseASTVariable)
        .map(d => d.toNullable())
        .filter(Boolean) as SassVariableDescriptor[]
    )

export const parseSass = (sassFile: string) =>
  toVariableDescriptors(sassFile).map(sortDescriptors)

export const parse = (sassFiles: string) =>
  parseSass(sassFiles)
    .run({ parser: getAST('sass') })