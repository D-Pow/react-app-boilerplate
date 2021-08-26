* ESM in browser.
    - Maybe mark all in `src/` as [externals](https://webpack.js.org/configuration/externals/)?
    - They'd probably still at least need Babel transpilation
    - Need to do both `module` and `nomodule` output.
        + [How to (not super in depth though)](https://dev.to/thejohnstew/differential-serving-3dkf)
        + Option: [webpack-module-nomodule-plugin](https://www.npmjs.com/package/webpack-module-nomodule-plugin)
        + Option: [html-webpack-multi-build-plugin](https://www.npmjs.com/package/html-webpack-multi-build-plugin)
* Allow `type: module` in package.json without webpack crashing on src/ imports without extensions.
    - Starter: https://developpaper.com/browser-module-main-field-priority-you-dont-know-about-in-package-json/
* [Tried, it was a pain] replace `babel-eslint` with `@babel-eslint-parser`
* Change AlterFilePostBuild to match [InterpolateHtmlPlugin](https://github.com/egoist/interpolate-html-plugin)
    - It's possible fs read/write isn't even necessary and maybe webpack does that part automatically
* ~~Remove `node_modules`/`vendor` from `webpack.entry`.~~
    - [Ref](https://webpack.js.org/concepts/entry-points/#separate-app-and-vendor-entries)
    - Test (again) on IE with MockRequests.
