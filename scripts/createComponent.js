const fs = require('fs');
const parseCliArgs = require('../config/parseCliArgs');

function getClassComponentText(componentName) {
    return (
`class ${componentName} extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div></div>
        );
    }
}`
    );
}

function getFunctionalComponentText(componentName) {
    return (
`function ${componentName}(props) {
    return (
        <div></div>
    );
}`
    );
}

function getComponentText(componentName, functional = false) {
    return (
`import React from 'react';
import PropTypes from 'prop-types';

${functional ? getFunctionalComponentText(componentName) : getClassComponentText(componentName)}

${componentName}.propTypes = {

};

${componentName}.defaultProps = {

};

export default ${componentName};
`
    );
}

function createComponentInDirectory(componentName, dirName = 'components', functionalComponent = false) {
    const dir = `./src/${dirName}/${componentName}`;
    const indexText = `import ${componentName} from './${componentName}';\n\nexport default ${componentName};\n`;
    const componentText = getComponentText(componentName, functionalComponent);

    fs.mkdir(`${dir}`, { recursive: true }, err => {
        if (err) {
            error(err);
        } else {
            fs.writeFile(`${dir}/index.js`, indexText, err => {
                if (err) {
                    error(err);
                } else {
                    fs.writeFile(`${dir}/${componentName}.js`, componentText, err => {
                        if (err) {
                            error(err);
                        } else {
                            console.log(`Created ${componentName} in src/${dirName}/`);
                        }
                    });
                }
            });
        }
    });
}


function printUsage() {
    const usage = `Creates a component inside its own folder in the src/ directory along with an index.js file.
    Usage: createComponent [-d|--dir = directoryUnderSrc] [-f|--func] ComponentName
    `;

    console.log(usage);
    process.exit(1);
}

function error(err) {
    console.error(err);
    process.exit(1);
}

function main() {
    const args = parseCliArgs({
        combineShortLongFlags: {
            isFunctionalComponent: [ 'f', 'func' ],
            dirName: [ 'd', 'dir' ],
        },
        numArgs: {
            isFunctionalComponent: 0,
            dirName: 1,
        },
    });

    const { isFunctionalComponent, dirName } = args;
    const componentName = args._?.[0];

    if (!componentName) {
        printUsage();
    }

    createComponentInDirectory(componentName, dirName, isFunctionalComponent);
}

main();
