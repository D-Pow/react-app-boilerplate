import CancellablePromise from 'utils/CancellablePromise';

function generateCancellablePromise({
    doTimeout = true,
    cancelInThen = false,
    throwInThen = false,
    cancelInCatch = false
} = {}) {
    const p = new CancellablePromise((res, rej) => {
        if (doTimeout) {
            setTimeout(() => {
                res('timeout resolved');
            }, 1000);
        } else {
            res('first resolution');
        }
    });

    p
        .then(x => {
            return x + ' - a';
        })
        .then(x => {
            if (throwInThen) {
                throw 'b';
            }

            return x + ' - b';
        })
        .then(x => {
            if (cancelInThen) {
                p.cancel();
            }

            return x + ' - c';
        })
        .then(x => {
            return x + ' - d';
        })
        .catch(e => {
            throw e + ' - e';
        })
        .catch(e => {
            if (cancelInCatch) {
                p.cancel();
            }

            throw e + ' - f';
        })
        .catch(e => {
            return e + ' - g';
        })
        .finally(res => console.log('FINALLY!', res));
}

describe('CancellablePromise', () => {
    it('should work as normal if no cancel() called', async () => {
        // TODO
    });

    it('should cancel .then() statements', async () => {
        // TODO
    });

    it('should cancel .catch() statements', async () => {
        // TODO
    });

    it('should still call .finally() regardless of .cancel() or not', async () => {
        // TODO
    });
});
