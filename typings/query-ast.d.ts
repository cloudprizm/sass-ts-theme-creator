declare module 'query-ast' {
  export interface ASTWrapperOptions<T> {
    hasChildren: (val: T) => boolean
    getChildren: (node: T) => T[]
    getType: (node: T) => string
    toJSON: (node: T, children: T[]) => {}
    toString: (node: T) => string
  }

  export interface NodeWrapper<T> {
    node: T
    hasChildren: () => boolean
    toJSON: () => JSON
  }

  export interface QueryWrapper<T> {
    get: (index: number) => T
    length: () => number
    map: <R = string>(d: (val: NodeWrapper<T>) => R) => R[] // need to check this
    children: (selector?: string) => QueryWrapper<T>
    first: () => QueryWrapper<T>
    parent: () => QueryWrapper<T>
    value: () => string
    node: T
    // nodes: QueryWrapper<T>
    nodes: Array<NodeWrapper<T>>
  }

  type ExportType = <K>(selector: JSON, context: ASTWrapperOptions<K>) =>
    (selector?: string) => QueryWrapper<K>

  export const createQueryWrapper: ExportType
  export default createQueryWrapper
}