import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';

import { importAssetAsync } from '@/utils/Events';
import AppContext, { AppContextFields } from '@/utils/AppContext';

function Image({
    className = '',
    src = '',
    fluidImage = true,
    updateAppContext = true,
    onLoad = () => {},
    aria = {},
} = {}) {
    const [ imageSrc, setImageSrc ] = useState('');
    const { setContextState } = useContext(AppContext.Context);

    async function loadImageSrc() {
        const imageSrcResponse = await importAssetAsync(src);

        setImageSrc(imageSrcResponse);
    }

    useEffect(() => {
        incrementAppContextField();
        loadImageSrc();
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
            alt={src}
            onLoad={handleLoad}
            {...aria}
        />
    );
}

Image.propTypes = {
    className: PropTypes.string,
    src: PropTypes.string,
    fluidImage: PropTypes.bool,
    updateAppContext: PropTypes.bool,
    onLoad: PropTypes.func,
    aria: PropTypes.object,
};

export default Image;
