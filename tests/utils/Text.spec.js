import { extractQuotedStrings } from '@/utils/Text';

describe('Text utils', () => {
    describe('extractQuotedStrings()', () => {
        it('should extract strings regardless of escaping, alternation, or newlines', () => {
            const testStrings = [
                `"This is an non-escaped-quote test\\\\"`,
                `"This is a test on a new line"`,
                `'Don\\'t mess up on this string containing an escaped quote in it'`,
                `"This has a single quote ' but doesn\\'t end the quote as it started with double quotes"`,
                `"String spanning multiple lines due to escaped quote\\"
                "`,
                `"Foo Bar"`,
                `"Another Value"`
            ];

            const aggregateString = `Hello world ${testStrings[0]}
                ${testStrings[1]}
                ${testStrings[2]} arbitrary outside text
                ${testStrings[3]}

                ${testStrings[4]}

                ${testStrings[5]} ${testStrings[6]} something else`;

            const extractedStrings = extractQuotedStrings(aggregateString);

            expect(extractedStrings.length).toBe(7);
            expect(extractedStrings).toEqual(testStrings);
        });
    });
});
