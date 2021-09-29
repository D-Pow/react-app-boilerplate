const fs = require('fs');
const parseCliArgs = require('../config/parseCliArgs');

function getPropTypes(componentName, typescript) {
    if (typescript) {
        return '';
    }

    return `
\n${componentName}.propTypes = {

};\n`;
}

function getClassComponentText(componentName, typescript) {
    return (
`class ${componentName} extends React.Component${typescript ? `<${componentName}Props, any>` : ''} {
    ${
        typescript
            ? ''
            : `static propTypes = {\n\n    };\n\n    `
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
`function ${componentName}(props${typescript ? `: ${componentName}Props` : ''} = {})${typescript ? ': React.ReactElement' : ''} {
    return (
        <>
            {props.children}
        </>
    );
}`;

    if (!typescript) {
        functionDefinitionStr += `\n\n${componentName}.propTypes = {

};\n\n${componentName}.defaultProps = {

};`;
    }

    return functionDefinitionStr;
}

function getComponentText(componentName, { functionalComponent = false, typescript = false } = {}) {
    let propTypesStrHeader = `import PropTypes from 'prop-types';`;

    if (typescript) {
        propTypesStrHeader =
`\ninterface ${componentName}Props {
    className?: string;
    children?: React.ReactChildren;
}`;
    }

    return (
`import React from 'react';
${propTypesStrHeader}

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
    const extension = typescript ? 'tsx' : 'jsx';
    const indexText = `import ${componentName} from './${componentName}.${extension}';\n\nexport default ${componentName};\n`;
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
            fs.writeFile(`${dir}/index.${extension}`, indexText, err => {
                if (err) {
                    error(err);
                } else {
                    fs.writeFile(`${dir}/${componentName}.${extension}`, componentText, err => {
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
    Usage: createComponent [-d|--dir = directoryUnderSrc] [-f|--func] [-t|--typescript] ComponentName
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
