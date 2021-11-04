import { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';

import { importAssetAsync } from '@/utils/Events';
import { extractFinalPathnameSegmentFromUrl, isUrl } from '@/utils/BrowserNavigation';
import AppContext, { AppContextFields } from '@/utils/AppContext';

function Image({
    className = '',
    src = '',
    alt,
    fluidImage = true,
    updateAppContext = true,
    onLoad = () => {},
    aria = {},
}) {
    const [ imageSrc, setImageSrc ] = useState('');
    const { setContextState } = useContext(AppContext.Context);

    async function loadImageSrc() {
        let imgSrc = src;

        if (!isUrl(src, { allowOnlyPathname: true })) {
            imgSrc = await importAssetAsync(src);
        }

        setImageSrc(imgSrc);
    }

    useEffect(() => {
        if (src) {
            incrementAppContextField();
            loadImageSrc();
        }
    }, [ src ]);

    function incrementAppContextField(finishedLoading = false) {
        if (updateAppContext) {
            const contextField = finishedLoading ? AppContextFields.LOADED : AppContextFields.REQUESTED;

            setContextState(prevState => ({
                ...prevState,
                [contextField]: prevState[contextField] + 1,
            }));
        }
    }

    function handleLoad(e) {
        incrementAppContextField(true);
        onLoad(e);
    }

    return (
        <img
            className={`${fluidImage ? 'img-fluid' : ''} ${className}`}
            src={imageSrc}
            alt={alt || extractFinalPathnameSegmentFromUrl(src)}
            onLoad={handleLoad}
            {...aria}
        />
    );
}

Image.propTypes = {
    className: PropTypes.string,
    src: PropTypes.string,
    alt: PropTypes.string,
    fluidImage: PropTypes.bool,
    updateAppContext: PropTypes.bool,
    onLoad: PropTypes.func,
    aria: PropTypes.object,
};

export default Image;
