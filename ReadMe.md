# react-app-boilerplate

A simplified boilerplate app for websites that's better organized
than create-react-app in that:

* Dependencies not required for the build are moved to devDependencies
* npm scripts are more clearly defined
* webpack config is exposed and configurable
* The service-worker both
    - Automatically caches all build output on first page load so subsequent visits/refreshes serve from cache (as opposed to needing two visits/one refresh before it caches them).
    - Will serve the app in a cache-then-network response so any changes will be shown in the next page load/refresh.
    - Dynamically caches non-build-output files that were requested after the app loads so they're ready for offline viewing.
        + This should be tweaked based on your app's needs so you only cache the files you want.
        + e.g. You don't want to cache images from user's posts in a social media app.
* Processes SCSS files to CSS and post-processes the CSS to make it cross-browser functional
* Allows both JavaScript and TypeScript codebases
* Has front-end mocking system built in natively along with usage examples (using [MockRequests](https://github.com/D-Pow/MockRequests))
* All configurations are moved to the `config/` folder for cleaner root directory and purpose distinction
* Uses ESM (`.mjs`) for Node scripts/configs while still allowing your source code to drop file extensions for `.js`/`.ts` files.

Usage Notes

* If using WebStorm
    - It doesn't properly interpret the tsconfig.json file because it contains comments and is not in the root directory. So, in order to point to the correct tsconfig.json file, update your settings to fix it by adding the line below in <br/>
    **WebStorm Settings | Languages & Frameworks | TypeScript | Options**:

        `-p config/tsconfig.json`

    * Since `NODE_PATH` is defined in config/webpack.config.mjs instead of .env, WebStorm doesn't correctly mark
    src/ as the root for imports. This can be resolved by right-clicking on `src/` -> `Mark Directory as` -> `Resource Root`.
