declare module 'gonzales-pe' {
  type NodeType = string

  export type Node = {
    type: NodeType
    content: Node[] | string
    syntax: string
    toJson(): string
    toString(): string
    removeChild(index: number): void
    traverseByTypes(types: NodeType[], cb: (node: Node, index: number, parent: Node) => void): void
  }

  export type Options = {
    start: boolean
    end: boolean
    syntax: 'sass' | 'scss' | 'css' | 'less'
  }

  export const parse: (val: string, options: Options) => Node
  export const createNode: (nodeLike: Partial<Node>) => Node
}