const fs = require('fs');

const COMPONENT_NAME_INDEX = 2;
const DIR_NAME_INDEX = 3;

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

function processArgs(args) {
    const functionalComponentFlagIndex = args.indexOf('func');
    const functionalComponentFlag = functionalComponentFlagIndex >= 0;

    if (functionalComponentFlag) {
        args.splice(functionalComponentFlagIndex, 1);
    }

    switch (args.length) {
        case 3:
            createClass(args[COMPONENT_NAME_INDEX], 'components', functionalComponentFlag);
            break;
        case 4:
            createClass(args[COMPONENT_NAME_INDEX], args[DIR_NAME_INDEX], functionalComponentFlag);
            break;
        default:
            printUsage();
    }
}

function createClass(componentName, dirName = 'components', functionalComponent = false) {
    const dir = `./src/${dirName}/${componentName}`;
    const indexText = `import ${componentName} from './${componentName}';\n\nexport default ${componentName};\n`;
    const componentText = getComponentText(componentName, functionalComponent);

    fs.mkdir(`${dir}`, {recursive: true}, err => {
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
    const usage = "Creates a component inside its own folder in the src/ directory along with an index.js file" +
        "\nUsage: createComponent NAME [directory under src/] [func|make functional component]";
    console.log(usage);
    process.exit(0);
}

function error(err) {
    console.error(err);
    process.exit(1);
}

processArgs(process.argv);
