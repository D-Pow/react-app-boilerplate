import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';

import { importAssetAsync } from '@/utils/Events';
import AppContext, { AppContextFields } from '@/utils/AppContext';

function Image(props) {
    const [ imageSrc, setImageSrc ] = useState('');
    const { setContextState } = useContext(AppContext.Context);

    async function loadImageSrc() {
        const imageSrcResponse = await importAssetAsync(props.src);

        setImageSrc(imageSrcResponse);
    }

    useEffect(() => {
        incrementAppContextField();
        loadImageSrc();
    }, [ props.src ]);

    function incrementAppContextField(finishedLoading = false) {
        if (props.updateAppContext) {
            const contextField = finishedLoading ? AppContextFields.LOADED : AppContextFields.REQUESTED;

            setContextState(prevState => ({
                ...prevState,
                [contextField]: prevState[contextField] + 1,
            }));
        }
    }

    function handleLoad(e) {
        incrementAppContextField(true);
        props.onLoad(e);
    }

    return (
        <img
            className={`${props.fluidImage ? 'img-fluid' : ''} ${props.className}`}
            src={imageSrc}
            alt={props.src}
            onLoad={handleLoad}
            {...props.aria}
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

Image.defaultProps = {
    className: '',
    src: '',
    fluidImage: true,
    updateAppContext: true,
    onLoad: () => {},
    aria: {},
};

export default Image;
