import React from 'react';

function IncompatibleBrowserFallback(props) {
    return (
        <div className={'text-center absolute-center top-20 w-100'}>
            <h1 className={'w-80 m-auto'}>
                Please use a modern browser (Chrome, Firefox, Safari) to view this website.
            </h1>
        </div>
    );
}

export default IncompatibleBrowserFallback;
