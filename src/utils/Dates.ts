import { round, numberToBaseX } from '@/utils/Numbers';

// Note: The `Date` constructor works with both UTC timestamps (seconds & milliseconds) as well
// as strings; `Date.parse(input)` only works with strings.

const Milliseconds = 1;
const Seconds = 1000 * Milliseconds;
const Minutes = 60 * Seconds;
const Hours = 60 * Minutes;
const Days = 24 * Hours;
const Weeks = 7 * Days;
const Years = 52 * Weeks;


export const TimeInMillis = {
    Milliseconds,
    Seconds,
    Minutes,
    Hours,
    Days,
    Weeks,
    Years,
};


export type DayMonthFormatOptionTypes = NonNullable<Intl.DateTimeFormatOptions['weekday']>;

export interface DayMonthFormatOptionsEntry {
    /**
     * Month name for the given month index [0-11].
     *
     * e.g. 0 = January | Jan | J
     */
    months: string[];
    /**
     * Weekday name for the given day index [0-6].
     *
     * What day starts the week (Sunday vs Monday vs other) depends on the user's locale.
     *
     * e.g. 0 = Monday | Mon | M
     */
    days: string[];
}

export type DayMonthFormatsType = {
    [K in DayMonthFormatOptionTypes as string]: DayMonthFormatOptionsEntry;
}

export const DayMonthFormatOptions: Record<Uppercase<DayMonthFormatOptionTypes>, DayMonthFormatOptionTypes> = {
    NARROW: 'narrow',
    SHORT: 'short',
    LONG: 'long',
};

/**
 * Day and month names in `long`, `short`, and `narrow` formats according to the user's language/locale setting.
 *
 * @see [`new Intl.DateTimeFormat()` MDN docs]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat}
 * @see [Related StackOverflow post]{@link }https://stackoverflow.com/questions/24998624/day-name-from-date-in-js}
 */
export const DayMonthFormats: DayMonthFormatsType = ([ 'long', 'short', 'narrow' ] as DayMonthFormatOptionTypes[])
    .reduce((names, nameType) => {
        const monthFormatter = new Intl.DateTimeFormat(undefined, {
            month: nameType,
        });
        const dayFormatter = new Intl.DateTimeFormat(undefined, {
            weekday: nameType,
        });

        const monthNames = Array.from({ length: 12 })
            .map((nul, monthIndex) => monthFormatter.format(new Date(2000, monthIndex)));
        const dayNames = Array.from({ length: 7 })
            .map((nul, dayIndex) => dayFormatter.format(new Date(2000, 1, dayIndex)));

        names[nameType] = {
            months: monthNames,
            days: dayNames,
        };

        return names;
    }, {} as DayMonthFormatsType);



/**
 * Compares two dates and returns their respective date-time part differences.
 *
 * If either date isn't specified, it replaces them with the current date-time value.
 *
 * @param [earlier] - Earlier date in the comparison.
 * @param [later] - Later date in the comparison.
 * @returns An object describing the difference of `earlier` and `later` respective to each date-time part.
 *
 * @see [MDN `Date` docs]{@link https://developer.mozilla.org/en-US/docs/web/javascript/reference/global_objects/date}
 * @see [SO post 1]{@link https://stackoverflow.com/questions/492994/compare-two-dates-with-javascript}
 * @see [SO post 2]{@link https://stackoverflow.com/questions/12413243/javascript-date-format-like-iso-but-local}
 */
export function diffDateTime(
    earlier = new Date(),
    later = new Date(),
) {
    let earlierDate = new Date(earlier);
    let laterDate = new Date(later);

    if (laterDate.valueOf() < earlierDate.valueOf()) {
        const earlierDateOrig = earlierDate;

        earlierDate = laterDate;
        laterDate = earlierDateOrig;
    }

    // Marked as `Record` for easy modification in the `Object.entries()` call below.
    // Keep in order from year to milliseconds for more direct use by calling parents.
    const diffDateObj: Record<string, number> = {
        years: laterDate.getFullYear() - earlierDate.getFullYear(),
        months: laterDate.getMonth() - earlierDate.getMonth(),
        days: laterDate.getDate() - earlierDate.getDate(),
        hours: laterDate.getHours() - earlierDate.getHours(),
        minutes: laterDate.getMinutes() - earlierDate.getMinutes(),
        seconds: laterDate.getSeconds() - earlierDate.getSeconds(),
        milliseconds: laterDate.getMilliseconds() - earlierDate.getMilliseconds(),
    };

    Object.entries(diffDateObj).reverse().forEach(([ key, val ], i, entries) => {
        const nextEntry = entries[i+1];

        if (!nextEntry) {
            return;
        }

        const [ nextKey, nextVal ] = nextEntry;
        const timeConfig = diffDateTime.ordersOfMagnitude[key as keyof typeof diffDateTime.ordersOfMagnitude];

        if (val < 0) {
            diffDateObj[key] = numberToBaseX(diffDateObj[key], timeConfig.maxValue, { signed: false });
            diffDateObj[nextKey] = nextVal - 1;
        }
    });

    return diffDateObj;
}
diffDateTime.ordersOfMagnitude = {
    milliseconds: {
        maxValue: 1,
    },
    seconds: {
        maxValue: 60,
    },
    minutes: {
        maxValue: 60,
    },
    hours: {
        maxValue: 24,
    },
    days: {
        maxValue: 7,
    },
    weeks: {
        maxValue: 4,
    },
    dates: {
        maxValue: 31,
    },
    months: {
        maxValue: 12,
    },
    years: {
        maxValue: 1,
    },
};



export interface DateToStringOptions {
    /**
     * If UTC date/time should be used instead of local date/time.
     */
    utc?: boolean;
    /**
     * Display length to use for month-name strings.
     *
     * Alternatively, use `b` or `B` between 1-3 times to set narrow/short/long display names.
     */
    monthDisplay?: string;
    /**
     * Display length to use for day-name strings.
     *
     * Alternatively, use `D` between 1-3 times to set narrow/short/long display names.
     */
    dayDisplay?: string;
}

/**
 * Formats a date in the desired string format.
 *
 * Options include:
 *
 * - `%y` = Year.
 * - `%M` = Month.
 * - `%d` = Date (number, not the day of the week).
 * - `%h` = Hour (use `%H` for hours that are relative to AM/PM, `%h` for 24-hour clock hours); Max of 2.
 * - `%m` = Minutes; Max of 2.
 * - `%s` = Seconds; Max of 2.
 * - `%l` = Milliseconds; Max of 3.
 * - `%D` = Day format (e.g. Monday, Mon, M); Max of 3.
 * - `%b` = Month format (e.g. January, Jan, J); Max of 3.
 * - `%z` = Timezone offset in hours (use `%Z` for full `GMT[+-](number)` string); Max of 3 chars; Positive is behind (later than) UTC; Negative is ahead of (earlier than) UTC.
 *
 * @param date - Date to format.
 * @param format - The desired format for the date.
 * @param options - Options for formatting.
 *
 * @see [SO question 1]{@link https://stackoverflow.com/questions/23593052/format-javascript-date-as-yyyy-mm-dd}
 * @see [SO question 2]{@link https://stackoverflow.com/questions/3552461/how-to-format-a-javascript-date}
 * @see [Example solution from `formateDate.js`]{@link https://github.com/mikebaldry/formatDate-js/blob/master/formatDate.js}
 * @see [Related `formatToParts()` function]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts}
 */
export function dateToString(date: Date = new Date(), format?: string, {
    utc = false,
    monthDisplay,
    dayDisplay,
}: DateToStringOptions = {}) {
    if (!format) {
        return date.toString();
    }

    const yearNumber = date[`get${utc ? 'UTC' : ''}FullYear`]();
    const monthNumber = date[`get${utc ? 'UTC' : ''}Month`]();
    const dateNumber = date[`get${utc ? 'UTC' : ''}Date`]();
    const dayOfWeekNumber = date[`get${utc ? 'UTC' : ''}Day`]();
    const hourNumber = date[`get${utc ? 'UTC' : ''}Hours`](); // 24-hour clock
    const minuteNumber = date[`get${utc ? 'UTC' : ''}Minutes`]();
    const secondNumber = date[`get${utc ? 'UTC' : ''}Seconds`]();
    const millisecondNumber = date[`get${utc ? 'UTC' : ''}Milliseconds`]();
    const timezoneOffsetHours = date.getTimezoneOffset() / 60; // Offset is in minutes; See `%z` JSDoc entry

    let useAmPm = false;

    // It's easier to use a match group to get the exact length of the requested date-time formatter substring
    // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_function_as_a_parameter
    let dateTimeStringFormatted = format
        .replace(/(%y+)/ig, (fullRegexStrMatch, matchGroup) => {
            // return `${yearNumber}`.substr(-1 * `${yearNumber}`.length, matchGroup.length);
            return `${yearNumber}`.substr(-1 * matchGroup.length, `${yearNumber}`.length);
        })
        .replace(/(%M+)/g, (fullRegexStrMatch, matchGroup) => {
            // Months start at 0 so add 1 to make it a readable month, i.e. January === 0
            return `${monthNumber + 1}`.padStart(matchGroup.length, '0');
        })
        .replace(/(%d+)/g, (fullRegexStrMatch, matchGroup) => {
            return `${dateNumber}`.padStart(matchGroup.length, '0');
        })
        .replace(/(%h+)/ig, (fullRegexStrMatch, matchGroup) => {
            useAmPm = !!matchGroup.match(/H/);

            const hourNumberToUse = (useAmPm && hourNumber > 12)
                ? hourNumber - 12
                : hourNumber;

            return `${hourNumberToUse}`.padStart(matchGroup.length, '0');
        })
        .replace(/(%m+)/g, (fullRegexStrMatch, matchGroup) => {
            return `${minuteNumber}`.padStart(matchGroup.length, '0');
        })
        .replace(/(%s+)/g, (fullRegexStrMatch, matchGroup) => {
            return `${secondNumber}`.padStart(matchGroup.length, '0');
        })
        .replace(/(%l+)/g, (fullRegexStrMatch, matchGroup) => {
            // Milliseconds are always <= 3 digits, so pad the beginning with zeros to make it a proper decimal number
            // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getMilliseconds
            const millisecondsTo3SignificantFigures = `${millisecondNumber}`.padStart(3, '0');
            // Convert integer to decimal place
            const millisecondsDecimal = `0.${millisecondsTo3SignificantFigures}`;
            // Round the milliseconds to the desired length
            const millisecondsDecimalRounded = round(millisecondsDecimal, matchGroup.length);
            // Remove leading `0.` from `0.xxx` number
            const millisecondNumberRounded = `${millisecondsDecimalRounded}`.replace(/^0\./, '');

            return `${millisecondNumberRounded}`.padStart(matchGroup.length, '0');
        })
        // String replacements must go after number replacements and after string replacements using
        // the same letters to avoid conflicts
        .replace(/(%D+)/g, (fullRegexStrMatch, matchGroup) => {
            if (dayDisplay) {
                return DayMonthFormats[dayDisplay].days[dayOfWeekNumber];
            }

            switch (matchGroup.length) {
                case 1:
                    return DayMonthFormats[DayMonthFormatOptions.NARROW].days[dayOfWeekNumber];
                case 2:
                    return DayMonthFormats[DayMonthFormatOptions.SHORT].days[dayOfWeekNumber];
                case 3:
                    return DayMonthFormats[DayMonthFormatOptions.LONG].days[dayOfWeekNumber];
                default:
                    return '';
            }
        })
        .replace(/(%b+)/ig, (fullRegexStrMatch, matchGroup) => {
            if (monthDisplay) {
                return DayMonthFormats[monthDisplay].months[monthNumber];
            }

            switch (matchGroup.length) {
                case 1:
                    return DayMonthFormats[DayMonthFormatOptions.NARROW].months[monthNumber];
                case 2:
                    return DayMonthFormats[DayMonthFormatOptions.SHORT].months[monthNumber];
                case 3:
                    return DayMonthFormats[DayMonthFormatOptions.LONG].months[monthNumber];
                default:
                    return '';
            }
        })
        .replace(/(%z+)/ig, (fullRegexStrMatch, matchGroup) => {
            // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
            const timezoneOffsetHoursPositiveNegativeString = (timezoneOffsetHours < 1)
                ? '+'
                : (timezoneOffsetHours > 1)
                    ? '-'
                    : '';

            if (!timezoneOffsetHoursPositiveNegativeString) {
                return 'UTC';
            }

            const useFullTimezoneOffsetString = !!matchGroup.match(/Z/);
            const fullTimezoneOffsetString = `${`${timezoneOffsetHours}`.padStart(2, '0')}00`;

            if (useFullTimezoneOffsetString) {
                return 'GMT' + timezoneOffsetHoursPositiveNegativeString + fullTimezoneOffsetString;
            }

            return matchGroup.length === 1
                ? `${timezoneOffsetHours}`
                : fullTimezoneOffsetString.substr(0, matchGroup.length);
        });

    if (useAmPm) {
        dateTimeStringFormatted += ` ${hourNumber > 12 ? 'PM' : 'AM'}`;
    }

    return dateTimeStringFormatted;
}
