import { MimeTypes } from '@/utils/Constants';


/**
 * Creates a new [WebWorker]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * using any of the methods to create one.
 *
 * @example Worker content exists in separate file
 * const worker = new WebWorker('myScript.js');
 * // Equivalent to:
 * const worker = new Worker('myScript.js');
 *
 *
 * @example Worker content exists in same HTML file
 * <script id="workerScript" type="javascript/worker">
 *     self.onmessage = e => {
 *         self.postMessage('Received: ' + e.data + 'Sent: message from worker');
 *     }
 * </script>
 * // Different <script/> context means the WebWorker has already been parsed, so we can access it directly
 * const stringOfWebWorkerInstance = document.getElementById('workerScript').textContent;
 *
 *
 * @example Worker content exists in same JavaScript file
 * // Requires "module" pattern to call the worker as an Immediately-Invoked-Function-Expressions (IIFE)
 * // since WebWorkers aren't allowed to be called directly from the main JS thread.
 * const worker = WebWorker.createWorkerFromFunctionString(MyWorkerFunc.toString());
 * // Equivalent to:
 * function MyWorker() {
 *     self.onmessage = e => {
 *         const data = e.data;
 *         self.postMessage(`Received "${data.message}" from "${data.name}"`);
 *     }
 * }
 * const worker = new Worker(URL.createObjectURL(new Blob([ `( ${MyWorker.toString()} )()` ])));
 * worker.addEventListener('message', event => { // or: worker.onmessage = ...
 *     document.write(event.data);
 * });
 * worker.addEventListener('error', err => {
 *     console.error(`Error (${err.message}) thrown in file (${err.filename}) at line (${err.lineno})`);
 * });
 * worker.postMessage({ name: 'worker', message: 'message-from-window'});
 */
class WebWorker {
    static createWorkerFromFunctionString(funcString) {
        // `type` option isn't absolutely necessary but added to ensure portability/usability
        const webWorkerBlob = new Blob([ `(${funcString})()` ], { type: MimeTypes.JS });
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
        }

        if (typeof workerSource === typeof this.constructor) {
            return WebWorker.createWorkerFromFunctionString(workerSource.toString());
        }

        throw new TypeError(`Type "${typeof workerSource}" is not supported. Please use a string (path to your WebWorker script) or a function (to be converted to a WebWorker).`);
    }
}

export default WebWorker;
