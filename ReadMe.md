# react-app-boilerplate

A simplified boilerplate app for websites that's better organized
than create-react-app in that:
* Dependencies not required for the build are moved to devDependencies
* npm scripts are more clearly defined
* webpack.config.js is exposed and configurable
* The service-worker both
    - Caches dynamically-generated files that contain hashes in them
    - Will update the app in a cache-then-network response so any changes will be shown in the next page load/refresh.
* Processes SCSS files to CSS and post-processes the CSS to make it cross-browser functional
* Allows both JavaScript and TypeScript codebases
* Has front-end mocking system built in natively along with usage examples
* All configurations are moved to the `config/` folder for cleaner root directory and purpose distinction

Note: If using WebStorm, it doesn't properly interpret all of the
tsconfig.json file because it contains comments, so add the following
line under **WebStorm Settings | Languages & Frameworks | TypeScript | Options**:

`--esModuleInterop true --jsx react`
