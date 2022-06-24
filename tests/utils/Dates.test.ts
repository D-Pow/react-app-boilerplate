import { diffDateTime } from '@/utils/Dates';


describe('Date utils', () => {
    describe('diffDateTime', () => {
        it('should work with both Date objects and Date-constructor values', () => {
            const dateDiff = diffDateTime('02-05-2022', new Date('02-12-2022'));
            const expectedDateDiff = {
                years: 0,
                months: 0,
                days: 7,
                hours: 0,
                minutes: 0,
                seconds: 0,
                milliseconds: 0,
            };

            expect(dateDiff).toEqual(expectedDateDiff);
        });

        it('should calculate correct dates across months', () => {
            const dateDiff = diffDateTime('05-30-2022', '06-23-2022');
            const expectedDateDiff = {
                years: 0,
                months: 0,
                days: 24,
                hours: 0,
                minutes: 0,
                seconds: 0,
                milliseconds: 0,
            };

            expect(dateDiff).toEqual(expectedDateDiff);
        });
    });
});
