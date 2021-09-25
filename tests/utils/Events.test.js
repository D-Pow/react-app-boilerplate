import { debounce, throttle } from '@/utils/Events';

jest.useFakeTimers();

class MyCounter {
    count = 0;

    incrementCount() {
        this.count++;
    }
}

describe('Event utils', () => {
    describe('debounce', () => {
        it('should bind `this` correctly', () => {
            const cls = new MyCounter();
            const debouncedFunction = debounce(
                cls.incrementCount,
                1000,
                {
                    bindThis: cls,
                },
            );

            expect(cls.count).toEqual(0);

            debouncedFunction();
            expect(cls.count).toEqual(0);
            debouncedFunction();
            expect(cls.count).toEqual(0);

            jest.advanceTimersByTime(1000);

            debouncedFunction();
            expect(cls.count).toEqual(1);
            debouncedFunction();
            expect(cls.count).toEqual(1);

            jest.advanceTimersByTime(1000);

            debouncedFunction();
            expect(cls.count).toEqual(2);
            debouncedFunction();
            expect(cls.count).toEqual(2);

            jest.advanceTimersByTime(1000);

            expect(cls.count).toEqual(3);
        });
    });

    describe('throttle', () => {
        it('should bind `this` correctly', () => {
            const cls = new MyCounter();
            const throttledFunction = throttle(
                cls.incrementCount,
                1000,
                {
                    bindThis: cls,
                },
            );

            expect(cls.count).toEqual(0);

            // Note the opposite order of `call()`/`expect()` for `throttle()` vs `debounce()`
            throttledFunction();
            expect(cls.count).toEqual(1);
            throttledFunction();
            expect(cls.count).toEqual(1);

            jest.advanceTimersByTime(1000);

            throttledFunction();
            expect(cls.count).toEqual(2);
            throttledFunction();
            expect(cls.count).toEqual(2);
        });
    });
});
