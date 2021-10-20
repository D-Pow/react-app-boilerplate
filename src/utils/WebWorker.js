class WebWorker {
    static createWorkerFromFunctionString(funcString) {
        // `type` option isn't absolutely necessary but added to ensure portability/usability
        const webWorkerBlob = new Blob([ `(${funcString})()` ], { type: 'application/javascript' });
        const webWorkerBlobUrl = URL.createObjectURL(webWorkerBlob);

        return new Worker(webWorkerBlobUrl);
    }

    /**
     * Creates a new WebWorker.
     *
     * @param {(string|function)} workerSource - The WebWorker script path as a string, or the function to convert to a WebWorker.
     * @returns {Worker} - A new WebWorker from the given source.
     * @see [WebWorker usage]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
     */
    constructor(workerSource) {
        // TODO Should this be all the class does?
        //  If so, then convert this class to a function and make file name plural.
        if (typeof workerSource === typeof '') {
            return new Worker(workerSource);
        } else if (typeof workerSource === typeof this.constructor) {
            return WebWorker.createWorkerFromFunctionString(workerSource.toString());
        } else {
            throw new TypeError(`Type "${typeof workerSource}" is not supported. Please use a string (path to your WebWorker script) or a function (to be converted to a WebWorker).`);
        }
    }
}

export default WebWorker;
