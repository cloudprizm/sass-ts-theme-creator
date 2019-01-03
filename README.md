`sass-ts-theme-creator`

Create theming `typescript` function from any `sass` file with compatible with `webpack-sass-var-loader` and `styled-component` theme, however not limited to these two.

Example, check out [`@hungry/bulma-theme`](https://github.com/hungry-consulting/bulma-theme).

### How it works
* parse all sass imported file and extracting variables from them
* all variables are sorted to keep correct relation between them, i.e. if something rely on `black` will be defined latter as `black` dependency - all of these are `topologically` sorted depends on theirs `dependencies`
* all expressions are defined as functions, to be able to resolve their values after overriding some `theme` variable, so if:
  * if there is a `hsl` color, it will be resolved in runtime and wrapped by `color` function, 
  * if there is an `addition` or `substraction` or any other `math operation` it will be presented as function as well. 
  * if you will be using some custom functions, you are in charge to define them when running theme. There are couple of hardcoded methods, such as `evaluate`, `color`. 

* resolvers of such functions, have `InjectedMethods` type and this type is auto-generated from `theme` file - so there is no chance to miss any implementation.

if you are interested how particular type is casted to typescript, check [`parse.test.ts`]() file and [`__snapshots`]().

### Why
* full sass porting to typescript with nested type correctness - string, number, string[], number[] etc.
* keeping relation between variables so changing root value like `black` will implies changes to all other elements which depend on this color
* what is exported, then all is typechecked - no more mistakes when porting stuff from external sources
* work seamlessly with bulma - full variable dump to file!
* all libs seems to be super limited and parsing only vars defined in one file, or have some strong assumption how file should be defined - this parser should accept any `sass` file
* there is no clean way to handle sass and styled-component and all available solution requires too much effort when you want to use something which is well defined - as it is in case of bulma and bulma components
* there is no typings for vars defined in sass 
* there is a lot of sass components out there - going piece by piece and editing manually of vars or gathering them in one file was pain in the ass for me, so yeah, laziness wins here
* I wanted to have something which help me port components from sass world easily
* I wanted something which will provide easy overridings on compilation level (compile bulma with all variables defined without breaking rules) - when going on prod - as well as in dev environment and further for theming styled components function
* all libraries with css typings assume that you have a green field project and starting css from scratch or you are porting everything to have this flavour - mine main goal was to improve adoption what is already there (lots of great bulma components) and if needed apply any changes without any effort (like updates) and manual work which is bug prone and pricey

### Examples
#### Saving to file

* extracting vars from files
```sass
// import files with variables to include src/variables.sass
@import 'bulma/sass/utilities/_all.sass'
@import 'bulma/sass/base/generic.sass'
@import 'bulma/sass/elements/_all.sass'
@import 'bulma/sass/components/_all.sass'
@import 'bulma/sass/grid/_all.sass'
@import 'bulma/sass/layout/_all.sass'
```

```ts
// such script can be used in postinstall step
import fs from 'fs'
import path from 'path'
import findNodeModules from 'find-node-modules'

import { sassToTypescript, parseFile } from '@component/sass-ts-theme-creator'

const withinSRC = (file) => path.resolve(__dirname, file)

// same configuration as with node-sass
const sassVars = parseFile({
  file: withinSRC('./variables.sass'), // ./src/variables.sass
  includePaths: findNodeModules({ cwd: __dirname }).map(withinSRC)
})

fs.writeFileSync('default.theme.ts', sassVars)
```

### Example
```ts
export type Methods = "color" | "evaluate";
export type InjectedMethods = Record<Methods, (val: string) => string>;

export type BulmaVars =
  | "black"
  | "blackBis"
  | "blackTer"
  | "greyDarker"
  | "familySansSerif"
  | "familyMonospace"
  | "renderMode"
  | "size1"
  | "size2"
  | "gap"
  | "camelCasedGap"
  | "tablet"
  | "desktop"
  | "widescreen"
  | "fullhd"
  | "easing"
  | "radiusSmall"
  | "radius";
export type BulmaTheme = Record<BulmaVars, string> & { weightLight: number } & {
  weightNormal: number;
} & { widescreenEnabled: boolean } & { fullhdEnabled: boolean } & {
  variableColumns: boolean;
} & {
  colors: Record<
    | "white"
    | "black"
    | "light"
    | "lightInvert"
    | "dark"
    | "darkInvert"
    | "primary"
    | "primaryInvert"
    | "link"
    | "linkInvert"
    | "info"
    | "infoInvert"
    | "success"
    | "successInvert"
    | "warning"
    | "warningInvert"
    | "danger"
    | "dangerInvert",
    string
  >;
} & {
  shades: Record<
    | "blackBis"
    | "blackTer"
    | "greyDarker"
    | "greyDark"
    | "grey"
    | "greyLight"
    | "greyLighter"
    | "whiteTer"
    | "whiteBis",
    string
  >;
};

export const makeBasicTheme = ({ color, evaluate }: InjectedMethods) => (
  overriding: Partial<BulmaTheme>
): BulmaTheme => {
  const black = overriding.black || color(`hsl(0,0%,4%)`);
  const blackBis = overriding.blackBis || color(`hsl(0,0%,7%)`);
  const blackTer = overriding.blackTer || color(`hsl(0,0%,14%)`);
  const greyDarker = overriding.greyDarker || color(`hsl(0,0%,21%)`);
  const familySansSerif =
    overriding.familySansSerif ||
    "BlinkMacSystemFont,-apple-system,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue','Helvetica','Arial',sans-serif";
  const familyMonospace = overriding.familyMonospace || "monospace";
  const renderMode = overriding.renderMode || "optimizeLegibility";
  const size1 = overriding.size1 || "3rem";
  const size2 = overriding.size2 || "2.5rem";
  const weightLight = overriding.weightLight || 300;
  const weightNormal = overriding.weightNormal || 400;
  const gap = overriding.gap || "64px";
  const camelCasedGap = overriding.camelCasedGap || "100px";
  const tablet = overriding.tablet || "769px";
  const desktop = overriding.desktop || evaluate(`960px+(2*${gap})`);
  const widescreen =
    overriding.widescreen || evaluate(`1152px+(2*${camelCasedGap})`);
  const widescreenEnabled = overriding.widescreenEnabled || true;
  const fullhd = overriding.fullhd || evaluate(`1344px+(2*${gap})`);
  const fullhdEnabled = overriding.fullhdEnabled || true;
  const easing = overriding.easing || "ease-out";
  const radiusSmall = overriding.radiusSmall || "2px";
  const radius = overriding.radius || "4px";
  const variableColumns = overriding.variableColumns || true;
  const colors = {
    white,
    black,
    light,
    lightInvert,
    dark,
    darkInvert,
    primary,
    primaryInvert,
    link,
    linkInvert,
    info,
    infoInvert,
    success,
    successInvert,
    warning,
    warningInvert,
    danger,
    dangerInvert
  };
  const shades = {
    blackBis,
    blackTer,
    greyDarker,
    greyDark,
    grey,
    greyLight,
    greyLighter,
    whiteTer,
    whiteBis
  };
  return {
    black,
    blackBis,
    blackTer,
    greyDarker,
    familySansSerif,
    familyMonospace,
    renderMode,
    size1,
    size2,
    weightLight,
    weightNormal,
    gap,
    camelCasedGap,
    tablet,
    desktop,
    widescreen,
    widescreenEnabled,
    fullhd,
    fullhdEnabled,
    easing,
    radiusSmall,
    radius,
    variableColumns,
    colors,
    shades
  };
};
```

### Creating any theme for component level
There is really cool [bulma extension](https://wikiki.github.io/), which can be adopted easly.
You can create theme on component level, to do so, you have to

create sass file
```sass
// Calendar.sass
@import '@hungry/bulma-theme/bulma-utils.sass'
@import 'bulma-calendar/src/sass/index.sass'
```
```ts
// generator file
const { parseFile } = require('@hungry/sass-ts-theme-creator')

const themeFile = parseFile({
  file: './Calendar.sass',
  includePaths: 'your node_modules folder'
})
```

### eh ... got a performance issue
* easy enough - just split couple of files instead of one massive `variable.sass` file - all `theme` files are `mappable` and `chainable` so you can join them as you want

#### Customizations
* how to define different parser
  * TODO
* how to define different template
  * TODO

### If something does not work ...
Raise an issue - happy to help, however PR are most welcome - hopefully code is easy to follow