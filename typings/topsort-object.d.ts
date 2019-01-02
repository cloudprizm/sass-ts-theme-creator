declare module 'toposort-object' {
  type TopologycalObjectSort = (objectToSort: Record<string, string[]>, reverse?: boolean) => string[]
  export const topsort: TopologycalObjectSort
  export default topsort
}