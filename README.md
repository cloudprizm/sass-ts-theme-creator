`sass-ts-theme-creator`
Create theming function from any `sass` file for `webpack-sass-var-loader` and `styled-component` theme, however it is not limited to these two.

check out `@hungry/bulma-theme`.

### Selling points
* full sass variable porting to typescript
* keeping relation between variables so changing root value like `black` will implies changes to all other elements which depend on this color
* what is exported, then all is typechecked - no more mistakes when porting stuff from external sources
* work seamlessly with bulma - full variable dump to file!

### Creating any theme for component level
There is really cool [bulma extension](https://wikiki.github.io/), where we can create theme for component level, to do so, you have to

create sass file
```sass
// Calendar.sass
@import '@hungry/bulma-theme/bulma-utils.sass'
@import 'bulma-calendar/src/sass/index.sass'
```
```ts
// generator file
const { parseFile } = require('@hungry/sass-ts-theme-creator')

const sassVars = parseFile({
  file: './Calendar.sass',
  includePaths: 'your node_modules folder'
})
```

### Why
* all libs seems to be super limited and parsing only vars defined in one file, or have some strong assumption how file should be defined
* there is no library which is translating sass to typescript - in many cases variables depend on each other, if tree is growing, then we should overriding all values which are dependant, but this is not easy case, this is why, this generator is keeping all relation, so if you've got a color, and latter on you are specifying color inverted, then relation will be kept since all vars are topologically sorted (like dependency tree).
* there is no clean way to handle sass and styled-component and all available solution requires too much effort when you want to use something which is well defined - as it is in case of bulma and bulma components
* there is no typings for vars defined in sass - I was push limits a bit here - all is defined and there is no place for mistake
* there is a lot of sass components out there - going piece by piece and editing manually of vars or gathering them in one file was pain in the *** for me, so yeah, laziness wins here
* I needed something which help me port components from sass world
* I needed something which will provide easy all overridings on compilation level (compile bulma with all variables defined without breaking rules) - when going on prod - as well as in dev environment and further for theming styled components function

* all libraries with css typings assume that you have a green field project and starting css from stratch or you are porting everything to have this flavour - mine main goal was to improve adoption what is already there (lots of great bulma compoennt) and if needed apply any changes without any effort (like updates) and manual work which is bug prone and pricey

* having theme where you are porting only a some sass vars is an issue, when you need to set custom theme for existing components like selects - now you can make any component themable with ease

### eh ... got a performance issue
* easy enough - just split couple of files instead of one massive `variable.sass` file - all got will share the same interface

### How it works
* sass variables as function in typescript
* parses whole sass tree and getting all defined variables - only top level as my main purpose was to handle bulma and it's vars
* taking all expressions and function, and if function is a `color` or some other like `findInverted` then it is introduced within closure

### Important parts
#### How template works
* `InjectedMethods`
* `overriding`

#### Customizations
* how to define different parser
* how to define different template

### Wins
* all vars as union - no way to do a mistake
* able to traverse a lot of file and get all of vars from there - only need is to configure `node-sass` correctly by using `parseFile` - function

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

### If something does not work ...
Raise an issue - happy to help, however PR are most welcome - hopefully code is easy to follow