import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

configure({ adapter: new Adapter() });

class StorageMock {
    storage = {};

    setItem(key, val) {
        this.storage[key] = val;
    }

    getItem(key) {
        return (key in this.storage) ? this.storage[key] : null;
    }

    removeItem(key) {
        delete this.storage[key];
    }

    clear() {
        this.storage = {};
    }

    get length() {
        return Object.keys(this.storage).length;
    }

    key(index) {
        return Object.keys(this.storage)[index] || null;
    }
}

global.localStorage = new StorageMock();
global.sessionStorage = new StorageMock();

global.XMLHttpRequest = jest.fn(() => {
    return {
        open: () => {},
        send: () => {}
    };
});

global.fetch = jest.fn(() => Promise.resolve({
    json: () => ({ realFetchResponse: 'realFetchResponse' }),
    text: () => 'realFetchResponse'
}));
global.Headers = jest.fn();
global.Request = jest.fn((url, options) => ({
    url,
    text: () => Promise.resolve(options ? options.body : '')
}));
