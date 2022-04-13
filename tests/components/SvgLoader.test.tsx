import SvgUrlDefault, {
    ReactComponent as SvgComponent,
    SvgUrl,
} from '@/assets/react_logo.svg';

import {
    renderWithWrappingParent,
    getDomFromRender,
    waitForElementVisible,
} from '~/tests';


function SvgRenders() {
    return (
        <>
            <p id="default">{SvgUrlDefault}</p>
            <p id="named-url">{SvgUrl}</p>
            <SvgComponent className={'blah'} />
        </>
    );
}

describe('SVG loader', () => {
    it('should show SVGs', async () => {
        const svgRenderer = renderWithWrappingParent(<SvgRenders />);
        const importedSvg = 'react_logo.svg';

        const defaultImportElem = await waitForElementVisible(svgRenderer, '#default');
        const defaultImportElemText = defaultImportElem.textContent;
        const namedImportElem = await waitForElementVisible(svgRenderer, '#named-url');
        const namedImportElemText = namedImportElem.textContent;
        const svgElem = await waitForElementVisible(svgRenderer, 'svg');
        const svgElemHtml = getDomFromRender(svgElem).html;

        // The SVG file URL itself
        // Default imports can cause strange behavior when mocked with Jest, so any of the following should match:
        // - The original file: `"importedSvg"`
        // - Stringified version: `"\"importedSvg\""`
        // - Parsed version: `"importedSvg"`
        const urlStringImportRegex = new RegExp(`['"]*${importedSvg}['"]*`);

        // Default export
        expect(importedSvg).toMatch(urlStringImportRegex);
        // A displayed version of the SVG file URL (since it was name-imported)
        expect(namedImportElemText).toMatch(urlStringImportRegex);
        // An SVG of the file itself (mocked in Jest to remove all child contents)
        expect(svgElemHtml.match(/^<svg[\s\S]*?(?!\/)(?:[\s\S]*<?\/(?:svg)?)>$/)?.[0]).toEqual(svgElemHtml);
    });
});
