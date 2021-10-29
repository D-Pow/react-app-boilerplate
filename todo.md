* Jest improvements.
    - WebStorm not recognizing aliases (probably due to a `npm_package_config` field).
    - Set `testEnvironment` based on file extension.
        + `.[tj]sx --> 'jsdom'`
        + `.[tj]s --> 'node'`
* [Webpack tree shaking](https://webpack.js.org/guides/tree-shaking/)
* `BrowserRouter` vs `HashRouter`
    - [Client vs Server routing](https://stackoverflow.com/questions/27928372/react-router-urls-dont-work-when-refreshing-or-writing-manually)
    - [Catch-all in Spring for index.html](https://stackoverflow.com/questions/39331929/spring-catch-all-route-for-index-html)
* ESM in browser.
    - Maybe mark all in `src/` as [externals](https://webpack.js.org/configuration/externals/)?
    - They'd probably still at least need Babel transpilation
    - Need to do both `module` and `nomodule` output.
        + [How to (not super in depth though)](https://dev.to/thejohnstew/differential-serving-3dkf)
        + Option: [webpack-module-nomodule-plugin](https://www.npmjs.com/package/webpack-module-nomodule-plugin)
        + Option: [html-webpack-multi-build-plugin](https://www.npmjs.com/package/html-webpack-multi-build-plugin)
        + Babel [targest.esmodules](https://babeljs.io/docs/en/babel-preset-env#targetsesmodules)
    - Investigate Babel preset-env [bugfixes](https://babeljs.io/docs/en/babel-preset-env#bugfixes)
        + Might help with browser ESM.
* Allow `type: module` in package.json without webpack crashing on src/ imports without extensions.
    - Starter: https://developpaper.com/browser-module-main-field-priority-you-dont-know-about-in-package-json/
* Abstract import aliases to separate file for use in webpack, typescript, jest, eslint, jsconfig, etc.
    - Starting place - Read aliases only from tsconfig: https://www.npmjs.com/package/tsconfig-paths-webpack-plugin
* Improve output website SEO/usability on different sites.
    - Duplicate/add useful `<meta>` tags in `HtmlWebpackPlugin` for [OpenGraph](https://www.freecodecamp.org/news/what-is-open-graph-and-how-can-i-use-it-for-my-website/) (how preview images/text appear when embedded in social media, Slack, etc.).
    - Site-map for which pages/routes exist on a website (helps for SEO).
* Change AlterFilePostBuild to match [InterpolateHtmlPlugin](https://github.com/egoist/interpolate-html-plugin)
    - It's possible fs read/write isn't even necessary and maybe webpack does that part automatically
    - Another option other than InterpolateHtmlPlugin: [serviceworker-webpack-plugin](https://github.com/oliviertassinari/serviceworker-webpack-plugin/blob/master/src/index.js)
