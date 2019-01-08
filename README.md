`sass-ts-theme-creator`

Extracting variables from `sass` files and provide `typescript` function with possibility to override. It is a bit different approach, as there is no manual effort needed, besides creating entry point for sass files. 
Huge win is that it keeps relation between variables so overriding one variable it will affect all related, it is not resolved by `node-sass` automatically but on the javascript side, so it works well with node and the web making it single source of truth.

Real world example [`@hungry/bulma-theme`](https://github.com/hungry-consulting/bulma-theme).

### How it works
* `theming` function
```ts
function theme(overridings = {}) {
  const black = overridings.black || '#000000'
  return {
    black
  }
}
const myTheme = theme()
```
Such theme can be used with `webpack-sass-var-loader` and `styled-component` theme.

#### with more details
* parse all `sass` files from entry point and extracting all variables
* variables from `sass` files are sorted to keep correct relation between them, i.e. if something rely on `black` will be defined latter as `black` dependency (variables are `topologically` sorted by theirs `dependencies`) - so there is no any issue with `hoisting`
* all expressions and values which are not primitives are defined as functions, to make correct overriding possible, so if:
  * if there is a `hsl` color, it will be resolved in runtime and wrapped by `color` function, 
  * if there is an `addition` or `substraction` or any other `math operation` it will be presented as function as well. 
  * if you will be using some custom functions, you are in charge to define them when running theme. There are couple of hardcoded methods, such as `evaluate`, `color`. 
* resolvers of such functions, have `InjectedMethods` type and this type is auto-generated from `theme` file - so there is no chance to miss any implementation.

### Why
* correctness - what is exported as a variable, is presented as [`union`](https://www.typescriptlang.org/docs/handbook/advanced-types.html) type, so there is no room for any mistakes related to variables not in sync
* lazy evaluation of variables - no `node-sass` involved in evaluation
* casting all sass values to typescript types, also arrays and theirs content, so string[], number[] will be casted correctly
* play nicely with `bulma` 
* existing solution does not give traversing many files from default, basically you are in charge what is exported, but here, importing `sass` files will do auto export all of variables
* all generated theme files can be `chained` to create bigger theme
* there is no clean way to handle sass and styled-component and all available solution requires too much effort when you want to use something which is well defined
* there is a lot of sass components out there - going piece by piece and editing manually of vars or gathering them in one file was too much time consuming

#### Personal wishes
* I wanted to have something which help me port components from sass world easily
* I wanted something which will provide easy overridings on compilation level (compile bulma with all variables defined without breaking rules) - when going on prod - as well as in dev environment and further for theming styled components function
* all libraries with css typings assume that you have a green field project and starting css from scratch or you are porting everything to have this flavour - mine main goal was to improve adoption what is already there (lots of great bulma components) and if needed apply any changes without any effort (like updates) and manual work which is bug prone and pricey

### Examples

#### Resolving `box-shadow`
```ts
  // INPUT
  const boxShadow = `
    $black: hsl(0%, 0%, $percent)
    $input-shadow: inset 0 1px 2px rgba($black, 0.1) !default
  `
  const themeFunction = sassToTypescript(boxShadow)

  // OUTPUT from themeFunction
  export type Methods = "color" | "evaluate";
  export type InjectedMethods = Record<
    Methods,
    (val: string | string[], src?: string) => string
  >;

  export type BulmaVars = "black" | "inputShadow";
  export type BulmaTheme = Record<BulmaVars, string>;

  export const makeBasicTheme = ({ color, evaluate }: InjectedMethods) => (
    overriding: Partial<BulmaTheme>
  ): BulmaTheme => {
    // default color value and ability to override it from external input
    const black = overriding.black || color(`hsl(0%, 0%, ${percent})`);
    // as inputShadow rely on black, is defined below black and as is not simple
    // is wrapped by evaluate function, this is normalized version of it,
    // so in this case join of array would be enough to get correct value
    // it is required as rgba has to be resolved to correct value
    const inputShadow =
      overriding.inputShadow ||
      evaluate([`inset`, `0`, `1px`, `2px`, `rgba(${black}, 0.1)`], "inputShadow");

    return {
      black,
      inputShadow
    };
  };
```

if you are interested how particular type is casted to typescript, `src/parse.test.ts` file and `src/__snapshots__`.

### Real example

### Resolving `Bulma` theme
#### Step 1 - Defining entry point for `sass` files

* extracting variables from many files
```sass
// entry point
// import files with variables to include src/variables.sass
@import 'bulma/sass/utilities/_all.sass'
@import 'bulma/sass/base/generic.sass'
@import 'bulma/sass/elements/_all.sass'
@import 'bulma/sass/components/_all.sass'
@import 'bulma/sass/grid/_all.sass'
@import 'bulma/sass/layout/_all.sass'
```

#### Step 2 - Defining extracting script and saving theme to file
```ts
// example script - such script can be used in postinstall step
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

#### Output - generated theme (partial)
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

### Creating theme function just for components
As you are able to `chain` and `map` all theme function, you can combine them together to make a bigger theme - it is huge win, as you can have well define components and separate them to rest of your `sass` framework without loosing any data.

#### Adopting is [bulma extension](https://wikiki.github.io/)

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

### eh ... got a performance issue as file with typing is too big
Happen, but easy enough - just split couple of files instead of one massive `variable.sass` file - all `theme` files are `mappable` and `chainable` so you can join them as you want

#### Customizations
* how to define different parser
  * TODO
* how to define different template
  * TODO

### If something does not work ...
Raise an issue - happy to help, however PR are most welcome - hopefully code is easy to follow

### Similar projects
* [sass-extract](https://www.npmjs.com/package/sass-extract)