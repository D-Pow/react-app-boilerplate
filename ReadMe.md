# react-app-boilerplate

A simplified boilerplate app for websites that's better organized
than create-react-app in that:


## Features

* Dependencies not required for the build are moved to `devDependencies`
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


## Installation

* `git clone <repo-url> [optional-custom-directory-name]`
* `npm install`


## Usage

* View all available commands: `npm run`
* Examples:
    - Start the local development server: `npm [run] start`
    - Start the local dev-server, mocking endpoint/API requests: `npm run mock`
    - Run unit tests: `npm [run] test`
    - Build the app: `npm run build`


## IDE Notes

* If using WebStorm
    - It doesn't always properly interpret the `webpack.config.mjs` file because it's not in the root directory. So, to point to the correct files, update your settings via:
        + **WebStorm Settings | Languages & Frameworks**
            * **| JavaScript | Webpack**:
              `config/webpack.config.mjs`

    - Since `@/` and `/` import aliases are used instead of relative imports (e.g. `../../File.js`), WebStorm doesn't always correctly mark `src/` as the root for imports. <br/>
    If this occurs, it can be resolved by right-clicking on `src/` -> `Mark Directory as` -> `Resource Root`.


## Diagrams

UML diagrams for classes, DBs, etc. can be made and embedded into ReadMe files using:

* [Mermaid](https://github.com/mermaid-js/mermaid) - [Playground](https://mermaid.live/)
    - Officially supported in GitHub, but possibly other providers as well.
    - See the related [blog post](https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/) for more details.
* [DrawIO](https://drawio-app.com) - [Playground](https://app.diagrams.net)
    - Give permission to GitHub, Google Drive, OneDrive, etc.
    - Export as an SVG file to your repo.
    - Display the SVG in ReadMe files via `![Display text](./MyUml.svg)`.
    - Each edit can be saved by exporting the new diagram to the same SVG via a commit.
