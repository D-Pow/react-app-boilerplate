#!/usr/bin/env node

const fs = require('fs');
const parseCliArgs = require('../config/parseCliArgs');

function getPropTypes(indentForClassStaticVar, typescript) {
    if (typescript) {
        return '';
    }

    const spacesIndent = ' '.repeat(4);
    const extraIndent = indentForClassStaticVar ? spacesIndent : '';

    return (
`propTypes = {
${extraIndent}    children: PropTypes.node,
${extraIndent}};`
    );
}

function getClassComponentText(componentName, typescript) {
    return (
`class ${componentName} extends React.Component${typescript ? `<${componentName}Props, any>` : ''} {
    ${
        typescript
            ? ''
            : `static ${getPropTypes(true, typescript)}\n\n    `
    }static defaultProps = {

    };

    render() {
        return (
            <>
                {this.props.children}
            </>
        );
    }
}`
    );
}

function getFunctionalComponentText(componentName, typescript) {
    let functionDefinitionStr =
`function ${componentName}(props${typescript ? `: ${componentName}Props` : ''} = {})${typescript ? ': React.ReactNode' : ''} {
    return (
        <>
            {props.children}
        </>
    );
}`;

    if (!typescript) {
        functionDefinitionStr +=
`

${componentName}.${getPropTypes(false, typescript)}`;
    }

    return functionDefinitionStr;
}

function getComponentText(componentName, { functionalComponent = false, typescript = false } = {}) {
    let propTypesImport = `import PropTypes from 'prop-types';`;

    if (typescript) {
        propTypesImport =
`\ninterface ${componentName}Props {
    className?: string;
    children?: React.ReactChildren;
}`;
    }

    return (
`import React from 'react';
${propTypesImport}

${functionalComponent ? getFunctionalComponentText(componentName, typescript) : getClassComponentText(componentName, typescript)}

export default ${componentName};
`
    );
}

function createComponentInDirectory(
    componentName,
    {
        dirName = 'components',
        functionalComponent = false,
        typescript = false,
    } = {},
) {
    const dir = `./src/${dirName}/${componentName}`;
    const componentFileExtension = typescript ? 'tsx' : 'jsx';
    const indexFileExtension = typescript ? 'ts' : 'js';
    const indexText = `import ${componentName} from './${componentName}';\n\nexport default ${componentName};\n`;
    const componentText = getComponentText(
        componentName,
        {
            functionalComponent,
            typescript,
        },
    );

    fs.mkdir(`${dir}`, { recursive: true }, err => {
        if (err) {
            error(err);
        } else {
            fs.writeFile(`${dir}/index.${indexFileExtension}`, indexText, err => {
                if (err) {
                    error(err);
                } else {
                    fs.writeFile(`${dir}/${componentName}.${componentFileExtension}`, componentText, err => {
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
    const usage = `Creates a new component inside its own folder under \`src/\` along with an \`index.[tj]s\` file.

    Usage:
        npm script (requires two hyphens):
            npm run createComponent -- [options] <ComponentName>
        Direct script call:
            ./createComponent.js [options] <ComponentName>

    Options:
        -d|--dir  <directory-name>  |   Directory under \`src/\` to place your component (default: \`components/\`).
        -f|--func                   |   Make the component a functional component instead of a class component.
        -t|--typescript             |   Use TypeScript instead of JavaScript to create the component.
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
            functionalComponent: [ 'f', 'func' ],
            dirName: [ 'd', 'dir' ],
            typescript: [ 't', 'typescript' ],
        },
        numArgs: {
            functionalComponent: 0,
            dirName: 1,
            typescript: 0,
        },
    });

    const { functionalComponent, dirName, typescript } = args;
    const componentName = args._?.[0];

    if (!componentName) {
        printUsage();
    }

    createComponentInDirectory(
        componentName,
        {
            dirName,
            functionalComponent,
            typescript,
        },
    );
}

main();
