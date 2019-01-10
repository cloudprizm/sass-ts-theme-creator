import { sassToTypescript } from '../src/sass-to-typescript'
import { percentToString, toHexColor } from '../src/parse-variable-type'
import { parseSass, parse } from '../src/parse-sass'
import { getAST } from '../src/sass-ast'
import { makeFunction } from '../src/sass-to-typescript-template'

// fixtures - required by bulma
const simpleColor = '$colorVar: #DDEEFF'
const simplePercent = '$percent: 10%'
const simpleNumber = '$number: 10 !default'
const colorFunction = `
  ${simplePercent}
  $callingHSL: hsl(0%, 0%, $percent)
`
const colorFunctionWith2Args = `
  $percentA: 10%
  $percentB: 10%
  $callingHSL: hsl(0%, $percentA, $percentB)
`
const externalFunctionCall = `
  ${simpleColor}
  ${simplePercent}
  $valueFromExternalFunction: findColor($colorVar, $percent)
`
const referencedValue = `
  ${simpleColor}
  $colorRef: $colorVar !default
  $refOfRef: $colorRef !default
`
const expressionWithOperators = `$calculationB: $simpleNumber + 10 - 100`

test('color test', () => {
  const sass = parseSass(simpleColor).run({ parser: getAST('sass') })
  const color = sass[0]
  expect([color.name, toHexColor(color)]).toEqual(['colorVar', '"#DDEEFF"'])
})

test('percent test', () => {
  const sass = parseSass(simplePercent).run({ parser: getAST('sass') })
  const percent = sass[0]
  expect([percent.name, percentToString(percent)]).toEqual(['percent', '"10%"'])
})

test('reference simple variable', () => {
  const sass = parseSass(referencedValue).run({ parser: getAST('sass') })
  const refDependency = sass[0]
  const valWithRef = sass[1]
  expect(refDependency.name).toBe('colorVar')
  expect(valWithRef.name).toBe('colorRef')
})

test('referenced variable - keeping right order when referencing variables', () => {
  const sass = parse(referencedValue.split('\n').reverse().join('\n'))
  const refDependency = sass[0]
  const valWithRef = sass[1]
  const refOfRef = sass[2]
  expect([refDependency.name, valWithRef.name, refOfRef.name]).toEqual(['colorVar', 'colorRef', 'refOfRef'])
})

test('testing order of deps - not sure why it is failing', () => {
  const data = `
    $danger-invert: $red-invert !default
    $red-invert: findColorInvert($red) !default
    $red: #DDEEFF
  `
  const sass = parse(data)
  const names = sass.map(d => d.name)
  expect(names).toEqual(['red', 'red-invert', 'danger-invert'])

  const fns = makeFunction(sass)
  expect(fns).toMatchSnapshot()
})

test('traversing to get correct non string type', () => {
  const data = `
    $numberReferenceC: $numberReferenceB !default
    $numberReferenceB: $numberReferenceA !default
    $numberReferenceA: $numberValue !default
    $numberValue: 1
  `
  const fns = sassToTypescript(data)
  expect(fns).toMatchSnapshot()
})

test('make closure with simple vars', () => {
  const sass = parse(referencedValue)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

test('external function to call', () => {
  const sass = parse(externalFunctionCall)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

test('resolve color functions - hsl', () => {
  const sass = parse(colorFunction)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

test('resolve color functions - hsl - with 2 variables', () => {
  const sass = parse(colorFunctionWith2Args)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

test('resolve hsl color with substitution', () => {
  const sass = parse(colorFunction)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

test('interpolation within function', () => {
  const sass = parse(`
    $control-padding-vertical: calc(0.375em - #{$control-border-width}) !default
    $control-padding-horizontal: calc(0.625em - #{$control-border-width}) !default'
  `)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

test('color - rgba', () => {
  const sass = parse(
    '$button-focus-box-shadow-color: rgba($link, 0.25) !default'
  )
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

const bulmaVar = `
  $black:        hsl(0, 0%, 4%) !default
  $black-bis:    hsl(0, 0%, 7%) !default
  $black-ter:    hsl(0, 0%, 14%) !default
  $grey-darker:  hsl(0, 0%, 21%) !default
  // Typography
  $family-sans-serif: BlinkMacSystemFont, -apple-system, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", "Helvetica", "Arial", sans-serif !default
  $family-monospace: monospace !default
  $render-mode: optimizeLegibility !default
  $size-1: 3rem !default
  $size-2: 2.5rem !default
  $weight-light: 300 !default
  $weight-normal: 400 !default
  // Responsiveness
  // The container horizontal gap, which acts as the offset for breakpoints
  $gap: 64px !default
  $camel-cased-gap: 100px !default
  // 960, 1152, and 1344 have been chosen because they are divisible by both 12 and 16
  $tablet: 769px !default
  // 960px container + 4rem
  $desktop: 960px + (2 * $gap) !default
  // 1152px container + 4rem
  $widescreen: 1152px + (2 * $camel-cased-gap) !default
  $widescreen-enabled: true !default
  // 1344px container + 4rem
  $fullhd: 1344px + (2 * $gap) !default
  $fullhd-enabled: true !default
  // Miscellaneous
  $easing: ease-out !default
  $radius-small: 2px !default
  $radius: 4px !default
  // Flags
  $variable-columns: true !default
  $colors: mergeColorMaps(("white": ($white, $black), "black": ($black, $white), "light": ($light, $light-invert), "dark": ($dark, $dark-invert), "primary": ($primary, $primary-invert), "link": ($link, $link-invert), "info": ($info, $info-invert), "success": ($success, $success-invert), "warning": ($warning, $warning-invert), "danger": ($danger, $danger-invert)), $custom-colors) !default
  $shades: mergeColorMaps(("black-bis": $black-bis, "black-ter": $black-ter, "grey-darker": $grey-darker, "grey-dark": $grey-dark, "grey": $grey, "grey-light": $grey-light, "grey-lighter": $grey-lighter, "white-ter": $white-ter, "white-bis": $white-bis), $custom-shades) !default
`

test('bulma variables parsing - without formatting', () => {
  const sass = parse(bulmaVar)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

test('bulma variables parsing - with formatting', () => {
  const themeFunction = sassToTypescript(bulmaVar)
  expect(themeFunction).toMatchSnapshot()
})

test('font', () => {
  const data = `
    $family-sans-serif: BlinkMacSystemFont, -apple-system, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", "Helvetica", "Arial", sans-serif !default
  `
  const sass = parse(data)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

test('expression', () => {
  const data = `
    $desktop: 960px + (2 * $gap_1 + $gap_2) + $gap_3 + $gap_4 !default
  `
  const sass = parse(data)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

test('ident - bool', () => {
  const data = `
    $fullhd-enabled: true !default
  `
  const sass = parse(data)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

// TODO check function to convert from size-1 to size1 and again to size-1
test('test sizes', () => {
  const comments = `
    $size-1: 3rem !default
    $size-2: 2.5rem !default
    $sizesArray: $size-1 $size-2
  `
  const sass = parse(comments)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

test('test comments', () => {
  const comments = `
    // sth
    // test
  `
  const sass = parse(comments)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

test('merge color maps', () => {
  const comments = `
    $shades: mergeColorMaps(("black-bis": $black-bis, "black-ter": $black-ter, "grey-darker": $grey-darker, "grey-dark": $grey-dark, "grey": $grey, "grey-light": $grey-light, "grey-lighter": $grey-lighter, "white-ter": $white-ter, "white-bis": $white-bis), $custom-shades) !default
    $colors: mergeColorMaps(("white": ($white, $black), "black": ($black, $white), "light": ($light, $light-invert), "dark": ($dark, $dark-invert), "primary": ($primary, $primary-invert), "link": ($link, $link-invert), "info": ($info, $info-invert), "success": ($success, $success-invert), "warning": ($warning, $warning-invert), "danger": ($danger, $danger-invert)), $custom-colors)!default
  `
  const sass = parse(comments)
  const themeFunction = makeFunction(sass)
  expect(themeFunction).toMatchSnapshot()
})

test('loading all sass files', () => {
  const input = `
  @import "minireset.sass"

  $some-var: 1 !default
  $some-var2: 1 !default

  $strong-color: $text-strong !default
  $strong-weight: $weight-bold !default

  =clearfix
    &::after
      clear: both
      content: " "
      display: table

  html
    background-color: $body-background-color
    font-size: $body-size
    -moz-osx-font-smoothing: grayscale
    -webkit-font-smoothing: antialiased
    min-width: 300px
    overflow-x: hidden
    overflow-y: scroll
    text-rendering: $body-rendering
    text-size-adjust: 100%
  `

  const themeFunction = sassToTypescript(input)
  expect(themeFunction).toMatchSnapshot()
})

test('export correct types', () => {
  const differentTypes = `
    // required to resolve correctly type
    $size-1: 1
    // required to resolve correctly type
    $white: #FFEEDD

    $colorHashMap: mergeColorMaps(("white": ($white, $black), "black": ($black, $white), "light": ($light, $light-invert), "dark": ($dark, $dark-invert), "primary": ($primary, $primary-invert), "link": ($link, $link-invert), "info": ($info, $info-invert), "success": ($success, $success-invert), "warning": ($warning, $warning-invert), "danger": ($danger, $danger-invert)), $custom - colors) !default
    $sizesArray: $size-1 $size-2 $size-3 $size-4 $size-5 $size-6 $size-7 !default
    $booleanType: true
    $numberType: 1
    $colorType: #FFEEDD
  `
  const themeFunction = sassToTypescript(differentTypes)
  expect(themeFunction).toMatchSnapshot()
})

test('test sizes from bulma - parsing array of values', () => {
  const sizes = `
    $sizes: $size-1 $size-2 $size-3 $size-4 $size-5 $size-6 $size-7 !default
  `
  const themeFunction = sassToTypescript(sizes)
  expect(themeFunction).toMatchSnapshot()
})

test('add test for negative numbers since it is resolved by expression', () => {
  const negativeStuff = `
    $navbar-dropdown-offset: -4px !default
    $navbar-bottom-box-shadow-size: 0 -2px 0 0 !default
    $navbar-dropdown-boxed-shadow: 0 8px 8px rgba($black, 0.1), 0 0 0 1px rgba($black, 0.1) !default

    // there is no operator so it is not resolving it to the list
    $table-cell-border-width: 0 0 1px !default
    $table-cell-padding: 0.5em 0.75em !default
    $mixed-content-with-string: 5px solid border
  `
  const themeFunction = sassToTypescript(negativeStuff)
  expect(themeFunction).toMatchSnapshot()
})

test('resolve array of numbers', () => {
  const dimensions = `
    $dimensions: 16 24 32 48 64 96 128 !default
  `
  const themeFunction = sassToTypescript(dimensions)
  expect(themeFunction).toMatchSnapshot()
})

test('boxshadow', () => {
  const boxShadow = `
    $black: hsl(0%, 0%, $percent)
    $input-shadow: inset 0 1px 2px rgba($black, 0.1) !default
  `
  const themeFunction = sassToTypescript(boxShadow)
  expect(themeFunction).toMatchSnapshot()
})