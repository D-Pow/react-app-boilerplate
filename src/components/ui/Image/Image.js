import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { importImageAsync } from 'utils/Functions';
import AppContext, { AppContextFields } from 'utils/AppContext';

function Image(props) {
    const [ imageSrc, setImageSrc ] = useState('');
    const { setContextState } = useContext(AppContext.Context);

    async function loadImageSrc() {
        const imageSrc = await importImageAsync(props.image);

        setImageSrc(imageSrc);
    }

    useEffect(() => {
        incrementAppContextField();
        loadImageSrc();
    }, [props.image]);

    function incrementAppContextField(finishedLoading = false) {
        if (props.updateAppContext) {
            const contextField = finishedLoading ? AppContextFields.LOADED : AppContextFields.REQUESTED;

            setContextState(prevState => ({
                ...prevState,
                [contextField]: prevState[contextField] + 1
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
            alt={props.image}
            onLoad={handleLoad}
            {...props.aria}
        />
    );
}

Image.propTypes = {
    className: PropTypes.string,
    image: PropTypes.string,
    fluidImage: PropTypes.bool,
    updateAppContext: PropTypes.bool,
    onLoad: PropTypes.func,
    aria: PropTypes.object
};

Image.defaultProps = {
    className: '',
    image: '',
    fluidImage: true,
    updateAppContext: true,
    onLoad: () => {},
    aria: {}
};

export default Image;
