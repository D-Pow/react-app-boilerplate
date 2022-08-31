#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { parseCliArgs, isMain } = require('../config/utils');


function getPropTypesText(indentForClassStaticVar, typescript) {
    if (typescript) {
        return '';
    }

    const spacesIndent = ' '.repeat(4);
    const extraIndent = indentForClassStaticVar ? spacesIndent : '';

    return (
`propTypes = {
${extraIndent}    className: PropTypes.string,
${extraIndent}    children: PropTypes.node,
${extraIndent}};`
    );
}


function getClassComponentText(componentName, typescript) {
    return (
`class ${componentName} extends React.Component${typescript ? `<${componentName}Props, ${componentName}State>` : ''} {
    ${
        typescript
            ? ''
            : `static ${getPropTypesText(true, typescript)}\n    `
    }static defaultProps = {};

    state = {};

    render() {
        return (
            <>
                <div className={this.props.className}>{this.props.children}</div>
            </>
        );
    }
}`
    );
}


function getFunctionalComponentText(componentName, typescript) {
    let functionDefinitionStr =
`function ${componentName}({
    className = '',
    children,
}${typescript ? `: ${componentName}Props` : ''}) {
    return (
        <>
            <div className={className}>{children}</div>
        </>
    );
}`;

    if (!typescript) {
        functionDefinitionStr +=
`

${componentName}.${getPropTypesText(false, typescript)}`;
    }

    return functionDefinitionStr;
}


function getComponentText(componentName, { functionalComponent = false, typescript = false } = {}) {
    let propTypesImport = `import PropTypes from 'prop-types';`;

    if (typescript) {
        propTypesImport =
`\nexport interface ${componentName}Props {
    className?: string;
    children?: React.ReactNode;
}`;

        if (!functionalComponent) {
            propTypesImport += `\n\ninterface ${componentName}State {}`;
        }
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
        dirName,
        functionalComponent,
        typescript,
        soloComponent,
    } = {},
) {
    const dir = `./src/components/${dirName}/${soloComponent ? '.' : componentName}`;
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

    try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(`${dir}/${componentName}.${componentFileExtension}`, componentText);

        if (!soloComponent) {
            fs.writeFileSync(`${dir}/index.${indexFileExtension}`, indexText);
        }

        console.log(`Created new "${componentName}" component in ${path.relative('.', dir)}/`);
    } catch (e) {
        error(e);
    }
}


function error(err) {
    console.error(err);
    process.exit(1);
}


/**
 * Creates a new React component under `src/components/`.
 *
 * Optionally allows:
 * - Specifying a sub-directory.
 * - Making it a functional component (default is a class component).
 * - Using TypeScript (default is JavaScript).
 *
 * @param {string[]} [argv] - Array of option flags with the component name arg as the final array entry.
 */
function createComponent(argv) {
    const usage = `Creates a new component inside its own folder under \`src/components/\` along with an \`index.[tj]s\` file.

Note - The format for using the script changes slightly based on how it's called:
    npm script (requires two hyphens if using \`npm\`, none if using \`yarn\`):
        npm run createComponent -- [options] <ComponentName>
    Direct script call:
        ./createComponent.js [options] <ComponentName>
`;

    const parsedArgs = parseCliArgs({
        argv,
        removeNodeAndScriptFromArgs: !argv,
        helpMessage: usage,
        optionsConfigs: {
            functionalComponent: {
                description: 'Make the component a functional component (default: class component).',
                aliases: [ 'f', 'func' ],
            },
            dirName: {
                description: 'Directory under `src/components/` to place your component.',
                numArgs: 1,
                defaultValue: '.',
                aliases: [ 'd', 'dir' ],
            },
            javascript: {
                description: 'Use JavaScript to create the component (default: TypeScript).',
                aliases: [ 'j' ],
            },
            soloComponent: {
                description: 'Create the component file only without nesting it in a new directory.',
                aliases: [ 's', 'solo' ],
            },
            help: {
                description: 'Print this message and exit.',
                aliases: [ 'h' ],
            },
        },
    });

    const {
        functionalComponent,
        dirName,
        javascript,
        soloComponent,
    } = parsedArgs;
    const componentName = parsedArgs._?.[0];

    createComponentInDirectory(
        componentName,
        {
            dirName,
            functionalComponent,
            typescript: !javascript,
            soloComponent,
        },
    );
}

if (isMain(__filename)) {
    createComponent();
}

module.exports = createComponent;
