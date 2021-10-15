import React from 'react';
import PropTypes from 'prop-types';

import Anchor from '@/components/ui/Anchor';
import { isIpAddress } from '@/utils/BrowserNavigation';

/**
 * Embedding .pdf (and similar .doc, .docx, etc.) files is slightly more complicated
 * than it seems. The displayed result heavily depends on the client browser's internal
 * rendering engine, so you can't rely on any one element/polyfill/JS/etc. solution, rather
 * you need at least one backup.
 *
 * Specifically, we have 3 options for naive document rendering:
 *
 * * `<iframe>`
 *     - Most powerful but also exposes the parent context to the embedded object (could be good if it's your own code or possibly bad if external code).
 *     - Embedded object is "live" so it can run JS scripts, use its own CSS, etc.
 *     - Is usually used for external resources b/c it automatically sandboxes the content.
 *     - Doesn't work as well for specific document types (<img>, <svg>, <canvas>, <video>, <math>, etc.).
 * * `<embed>`
 *     - Second most powerful, but also more limited in parent/child communication.
 *     - Works slightly better than `<iframe>` for specific document types.
 * * `<object>`
 *     - Least powerful, doesn't allow much parent/child communication.
 *     - Most accessible: Internal render logic handles specific document types quite well; supports old browsers.
 *     - Has a fallback display (in `children`) in case the source URL fails to load.
 *
 * Furthermore, we use a combination of the above elements to display the document.
 * Use `<object>` for accessibility and add in a hyperlink to the Google Docs viewer
 * as a fallback in case the `<object>` doesn't render properly.
 * Note: The Google Docs viewer has very good support for other document types (.doc, .docx, etc.).
 *
 * Refs:
 * [Short overview of the three]{@link https://stackoverflow.com/questions/16660559/difference-between-iframe-embed-and-object-elements/21115112#21115112}
 * [iframe docs]{@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe}
 * [embed docs]({@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/embed}
 * [object docs]({@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object}
 *
 * Alternatives:
 * [PdfJS]{@link https://mozilla.github.io/pdf.js/}
 * [DocoNut]{@link https://doconut.com/Welcome/}
 */

const PDF_MIME_TYPE = 'application/pdf';
const GOOGLE_PDF_VIEWER_URL = 'https://docs.google.com/viewer?embedded=true&url=';

function ResourceViewer({
    src,
    altLinkText,
    mimeType,
    includeNestedEmbedTag,
    objectRef,
    ...props
}) {
    if (!src || !altLinkText) {
        return null;
    }

    const isHttpUrl = src.indexOf('http') === 0 && !isIpAddress(src, true);
    const backupHyperlinkSrc = mimeType === PDF_MIME_TYPE
        ? GOOGLE_PDF_VIEWER_URL + encodeURIComponent(src)
        : src;
    const embeddedViewerSrc = isHttpUrl ? backupHyperlinkSrc : src;

    return (
        <object
            data={embeddedViewerSrc}
            type={mimeType}
            ref={objectRef}
            {...props}
        >
            <Anchor href={backupHyperlinkSrc}>
                {altLinkText}
            </Anchor>
            {includeNestedEmbedTag && (
                <embed
                    src={src}
                    type={mimeType}
                />
            )}
        </object>
    );
}

ResourceViewer.propTypes = {
    src: PropTypes.string.isRequired,
    altLinkText: PropTypes.string.isRequired,
    mimeType: PropTypes.string.isRequired,
    includeNestedEmbedTag: PropTypes.bool,
    objectRef: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.shape({
            current: PropTypes.instanceOf(PropTypes.element),
        }),
    ]),
};

ResourceViewer.defaultProps = {
    src: '',
    altLinkText: '',
    mimeType: PDF_MIME_TYPE,
    includeNestedEmbedTag: false,
};

export default React.memo(ResourceViewer);
