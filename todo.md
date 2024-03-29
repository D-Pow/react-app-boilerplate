* Jest improvements.
    - Set `testEnvironment` based on file extension.
        + `.[tj]sx --> 'jsdom'`
        + `.[tj]s --> 'node'`
* [Webpack tree shaking](https://webpack.js.org/guides/tree-shaking/)
* How to make your React app importable from an `npm install`.
    - Also would likely want to convert TypeScript interfaces/types to PropTypes.
        + [Possible starting place](https://stackoverflow.com/questions/54060057/generating-proptypes-for-react-components-written-in-typescript/54329083#54329083).
* ESM in browser.
    - Maybe mark all in `src/` as [externals](https://webpack.js.org/configuration/externals/)?
    - They'd probably still at least need Babel transpilation
    - Need to do both `module` and `nomodule` output.
        + [How to (not super in depth though)](https://dev.to/thejohnstew/differential-serving-3dkf)
        + Option: [webpack-module-nomodule-plugin](https://www.npmjs.com/package/webpack-module-nomodule-plugin)
        + Option: [html-webpack-multi-build-plugin](https://www.npmjs.com/package/html-webpack-multi-build-plugin)
        + Option: [EsmWebpackPlugin](https://github.com/purtuga/esm-webpack-plugin)
        + Babel [targest.esmodules](https://babeljs.io/docs/en/babel-preset-env#targetsesmodules)
            * Would likely require the module/nomodule pattern offered by [@babel/preset-modules](https://www.npmjs.com/package/@babel/preset-modules).
            * See the [preset-env bugfixes](https://babeljs.io/docs/en/babel-preset-env#bugfixes) option for more details.
    - Investigate Babel preset-env [bugfixes](https://babeljs.io/docs/en/babel-preset-env#bugfixes)
        + Might help with browser ESM.
    - Customize package.json [`exports` field](https://nodejs.org/docs/latest-v16.x/api/packages.html#package-entry-points)
        + Allows exporting multiple files (e.g. `.mjs` and `.js`) when publishing libraries.
        + File chosen depends on the consuming project's import statement. For example:
            ```javascript
            // package.json
            {
                "exports": {
                    // Will choose the correct file based on import-statement keyword
                    ".": {
                        "import": "dist/index.mjs",
                        "require": "dist/index.js",
                    },
                    // Will select a file based on import query
                    "./Button": "dist/components/Button.js", // Tree-shaking example
                    "./components/*.js": "dist/components/*.js", // Tree-shaking with globs (** isn't necessary)
                    "./internal/": null // Hide files you don't want consumers to import
                }
            }
            ```
        + Example: [postcss-js](https://github.com/postcss/postcss-js/blob/main/package.json#L24)
* Allow `type: module` in package.json without webpack crashing on src/ imports without extensions.
    - Starter: https://developpaper.com/browser-module-main-field-priority-you-dont-know-about-in-package-json/
* Add preview/start image in `manifest.json` for when the installed PWA is opening before the page content is actually loaded and the spinner shows.
* Improve output website SEO/usability on different sites.
    - Duplicate/add useful `<meta>` tags in `HtmlWebpackPlugin` for [OpenGraph](https://www.freecodecamp.org/news/what-is-open-graph-and-how-can-i-use-it-for-my-website/) (how preview images/text appear when embedded in social media, Slack, etc.).
    - Site-map for which pages/routes exist on a website (helps for SEO). One possibly helpful package is [next-sitemap](https://www.npmjs.com/package/next-sitemap) in a `postbuild` npm script.
* Investigate isomorphic JavaScript.
    - Could be SSR, could be React Native, or something else.
    - During investigation, check out differences between:
        + [NextJS](https://nextjs.org/) - All-in-one/no-configuration-required system.
        + [React Starter Kit](https://github.com/kriasoft/react-starter-kit) - Not as much no-configuration-required, meaning we have more control over configs.
            * Uses [isomorphic-style-loader](https://github.com/kriasoft/isomorphic-style-loader) for loading (S)CSS styles in all (back-/front-end) contexts.
* `BrowserRouter` vs `HashRouter`
    - [Client vs Server routing](https://stackoverflow.com/questions/27928372/react-router-urls-dont-work-when-refreshing-or-writing-manually)
    - [Catch-all in Spring for index.html](https://stackoverflow.com/questions/39331929/spring-catch-all-route-for-index-html)
* Change AlterFilePostBuild to match [InterpolateHtmlPlugin](https://github.com/egoist/interpolate-html-plugin)
    - It's possible fs read/write isn't even necessary and maybe webpack does that part automatically
    - Another option other than InterpolateHtmlPlugin: [serviceworker-webpack-plugin](https://github.com/oliviertassinari/serviceworker-webpack-plugin/blob/master/src/index.js)
