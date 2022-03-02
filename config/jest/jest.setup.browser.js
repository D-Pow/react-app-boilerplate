import { CustomizableObject } from '@/utils/Objects';

import { mockObjProperty } from '~/config/jest/jest.setup.testUtils';

global.XMLHttpRequest = global.XMLHttpRequest || jest.fn(() => {
    return {
        open: () => {},
        send: () => {},
    };
});

global.fetch = global.fetch || jest.fn(() => Promise.resolve({
    json: () => ({}),
    text: () => '',
}));
global.Request = global.Request || jest.fn((url, options) => ({
    url,
    text: () => Promise.resolve(options ? options.body : ''),
}));
class Headers extends CustomizableObject {
    append(key, value) {
        if (this[key]) {
            this[key] += `,${value}`;
        } else {
            this[key] = value;
        }

        return this;
    }

    entries() {
        // Native `Headers.prototype.entries` reverses key/value
        return super.entries().map(([ key, value ]) => [ value, key ]);
    }
}
global.Headers = global.Headers || Headers;


export class StorageMock extends CustomizableObject {
    constructor(init) {
        super(init);
        // TODO Figure out how to delete functions from parent class in child class' constructor
    }

    getItem(key) {
        return (key in this) ? this[key] : null;
    }

    setItem(key, val) {
        super.set(key, val);
    }

    removeItem(key) {
        super.delete(key);
    }
}

global.localStorage = global.localStorage || new StorageMock();
global.sessionStorage = global.sessionStorage || new StorageMock();

beforeEach(() => {
    global.localStorage.clear();
    global.sessionStorage.clear();
});


// See: https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
mockObjProperty(window, 'matchMedia', jest.fn(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
})));
