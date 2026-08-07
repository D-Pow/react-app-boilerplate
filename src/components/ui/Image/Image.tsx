import { useState, useEffect, useContext, type ReactEventHandler } from 'react';

import { importAssetAsync } from '@/utils/Events';
import { extractFinalPathnameSegmentFromUrl, isUrl } from '@/utils/BrowserNavigation';
import AppContext, { AppContextFields, type AppContextState } from '@/utils/AppContext';

// TODO Don't reload images that have already been loaded

export interface ImageProps {
  className?: string
  src?: string
  alt?: string
  fluidImage?: boolean
  updateAppContext?: boolean
  onLoad?(...args: unknown[]): unknown
  aria?: object
}

function Image({
    className = '',
    src = '',
    alt,
    fluidImage = true,
    updateAppContext = false,
    onLoad = () => {},
    aria = {},
}: ImageProps) {
    const [ imageSrc, setImageSrc ] = useState('');
    const { setContextState } = useContext(AppContext);

    async function loadImageSrc() {
        let imgSrc = src;

        if (!isUrl(src, { allowOnlyPathname: true })) {
            try {
                imgSrc = await importAssetAsync(src);
            } catch (imgSrcNotInAssetsDirError) {}
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

            setContextState((prevState: AppContextState) => ({
                ...prevState,
                [contextField]: prevState[contextField] + 1,
            }));
        }
    }

    function handleLoad(e: Event) {
        incrementAppContextField(true);
        onLoad(e);
    }

    return (
        <img
            className={`${fluidImage ? 'img-fluid' : ''} ${className}`}
            src={imageSrc}
            alt={alt || extractFinalPathnameSegmentFromUrl(src)}
            onLoad={handleLoad as unknown as ReactEventHandler<HTMLImageElement>}
            {...aria}
        />
    );
}

export default Image;
