// TODO try AbortSignal: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
class CancellablePromise extends Promise {
    cancelled = false; // If the promise has been cancelled
    children = []; // Hierarchy tracker so child promises are aware of parent promises' `cancelled` statuses

    constructor(...args) {
        super(...args);
        this.children.push(this);
        return this;
    }

    /**
     * Checks this and all parent promises for if one of them was cancelled.
     * If one was cancelled, then all should be cancelled.
     *
     * Note that a new CancellablePromise is generated upon every `.then()`, `.catch()`, and `.finally()` call.
     *
     * @returns {boolean} - If this promise or any of its calling promises have been cancelled.
     */
    getIsCancelled = () => this.children.some(cancellablePromise => cancellablePromise.cancelled);

    then(...args) {
        // .then() could have a single function for successes or multiple for success/failure cases
        const onSuccess = typeof args[0] === typeof this.then ? args[0] : () => {};
        const onError = typeof args[1] === typeof this.then ? args[1] : e => { throw e; };

        const resultingPromise = super.then.call(
            this,
            thenResults => {
                if (this.getIsCancelled()) {
                    return thenResults;
                }

                return onSuccess(thenResults);
            },
            catchResults => {
                if (this.getIsCancelled()) {
                    return catchResults;
                }

                return onError(catchResults);
            },
        );

        // Add the newly-generated promise to the `children` array so that if it's cancelled, it's children can know about it
        this.children.push(resultingPromise);
        resultingPromise.children = this.children; // We don't want a new array here b/c if a parent's `cancelled` status is changed, all children should be able to see it

        return resultingPromise; // Must return the new, resulting promise, not `this`, b/c each promise has a different return result
    }

    catch(...args) {
        const onError = typeof args[0] === typeof this.catch ? args[0] : e => { throw e; };

        const resultingPromise = super.catch.call(
            this,
            catchResults => {
                if (this.getIsCancelled()) {
                    return catchResults;
                }

                return onError(catchResults);
            },
        );

        this.children.push(resultingPromise);
        resultingPromise.children = this.children;

        return resultingPromise;
    }

    finally(...args) {
        const onFinally = typeof args[0] === typeof this.finally ? args[0] : () => {};
        const handleFinally = finallyResults => { // Want to duplicate `.finally()` function b/c it doesn't matter whether or not an error occurred
            return onFinally(finallyResults);
        };

        const resultingPromise = super.then.call( // Call `.then()` since it has both success and fail handler functions
            this,
            handleFinally,
            handleFinally,
        );

        return resultingPromise;
    }

    cancel() {
        this.cancelled = true;

        return this;
    }
}

export default CancellablePromise;
