import { round, numberToBaseX } from '@/utils/Numbers';

import type {
    ValueOf,
} from '@/types';


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
        dates: laterDate.getDate() - earlierDate.getDate(),
        hours: laterDate.getHours() - earlierDate.getHours(),
        minutes: laterDate.getMinutes() - earlierDate.getMinutes(),
        seconds: laterDate.getSeconds() - earlierDate.getSeconds(),
        milliseconds: laterDate.getMilliseconds() - earlierDate.getMilliseconds(),
    };

    Object.entries(diffDateObj).reverse().forEach(([ key, val ], i, entries) => {
        const nextEntry = entries[i + 1];

        if (!nextEntry) {
            // We can safely return from the object iteration when `years` is reached
            // due to the safety net of ensuring `earlierDate < laterDate` and no value
            // of any other date-time part can surpass years (i.e. `years` is always >= 0)
            return;
        }

        const [ nextKey, nextVal ] = nextEntry;
        const timeConfig = diffDateTime.ordersOfMagnitude[key as keyof typeof diffDateTime.ordersOfMagnitude];

        if (val < 0) {
            diffDateObj[key] = numberToBaseX(diffDateObj[key], timeConfig.maxValue, { signed: false });
            diffDateObj[nextKey] = nextVal - 1;
        }
    });

    // Make the `dates` field more readable by renaming to `days`
    diffDateObj.days = diffDateObj.dates;
    delete diffDateObj.dates;

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


export const TimeZones = {
    // Don't use since the XSTnXDT times account for daylight savings
    // EST: 'EST',
    // MST: 'MST',
    // HST: 'HST',
    ET: 'EST5EDT',
    CT: 'CST6CDT',
    MT: 'MST7MDT',
    PT: 'PST8PDT',
    GMT: 'Etc/GMT',
    UTC: 'Etc/UTC',
    'GMT-14': 'Etc/GMT-14',
    'GMT-13': 'Etc/GMT-13',
    'GMT-12': 'Etc/GMT-12',
    'GMT-11': 'Etc/GMT-11',
    'GMT-10': 'Etc/GMT-10',
    'GMT-9': 'Etc/GMT-9',
    'GMT-8': 'Etc/GMT-8',
    'GMT-7': 'Etc/GMT-7',
    'GMT-6': 'Etc/GMT-6',
    'GMT-5': 'Etc/GMT-5',
    'GMT-4': 'Etc/GMT-4',
    'GMT-3': 'Etc/GMT-3',
    'GMT-2': 'Etc/GMT-2',
    'GMT-1': 'Etc/GMT-1',
    'GMT+1': 'Etc/GMT+1',
    'GMT+2': 'Etc/GMT+2',
    'GMT+3': 'Etc/GMT+3',
    'GMT+4': 'Etc/GMT+4',
    'GMT+5': 'Etc/GMT+5',
    'GMT+6': 'Etc/GMT+6',
    'GMT+7': 'Etc/GMT+7',
    'GMT+8': 'Etc/GMT+8',
    'GMT+9': 'Etc/GMT+9',
    'GMT+10': 'Etc/GMT+10',
    'GMT+11': 'Etc/GMT+11',
    'GMT+12': 'Etc/GMT+12',
    Factory: 'Factory',
    WET: 'WET',
    CET: 'CET',
    MET: 'MET',
    EET: 'EET',
    Caracas: 'America/Caracas',
    Montevideo: 'America/Montevideo',
    Paramaribo: 'America/Paramaribo',
    Lima: 'America/Lima',
    Asuncion: 'America/Asuncion',
    Guyana: 'America/Guyana',
    Cayenne: 'America/Cayenne',
    Guayaquil: 'America/Guayaquil',
    Bogota: 'America/Bogota',
    Punta_Arenas: 'America/Punta_Arenas',
    Santiago: 'America/Santiago',
    Rio_Branco: 'America/Rio_Branco',
    Eirunepe: 'America/Eirunepe',
    Manaus: 'America/Manaus',
    Boa_Vista: 'America/Boa_Vista',
    Porto_Velho: 'America/Porto_Velho',
    Cuiaba: 'America/Cuiaba',
    Campo_Grande: 'America/Campo_Grande',
    Sao_Paulo: 'America/Sao_Paulo',
    Bahia: 'America/Bahia',
    Maceio: 'America/Maceio',
    Araguaina: 'America/Araguaina',
    Recife: 'America/Recife',
    Fortaleza: 'America/Fortaleza',
    Santarem: 'America/Santarem',
    Belem: 'America/Belem',
    Noronha: 'America/Noronha',
    La_Paz: 'America/La_Paz',
    Ushuaia: 'America/Argentina/Ushuaia',
    Rio_Gallegos: 'America/Argentina/Rio_Gallegos',
    San_Luis: 'America/Argentina/San_Luis',
    Mendoza: 'America/Argentina/Mendoza',
    Catamarca: 'America/Argentina/Catamarca',
    Jujuy: 'America/Argentina/Jujuy',
    San_Juan: 'America/Argentina/San_Juan',
    La_Rioja: 'America/Argentina/La_Rioja',
    Tucuman: 'America/Argentina/Tucuman',
    Salta: 'America/Argentina/Salta',
    Cordoba: 'America/Argentina/Cordoba',
    Buenos_Aires: 'America/Argentina/Buenos_Aires',
    Grand_Turk: 'America/Grand_Turk',
    Miquelon: 'America/Miquelon',
    Puerto_Rico: 'America/Puerto_Rico',
    Panama: 'America/Panama',
    Managua: 'America/Managua',
    Martinique: 'America/Martinique',
    Jamaica: 'America/Jamaica',
    Tegucigalpa: 'America/Tegucigalpa',
    PortAuPrince: 'America/Port-au-Prince',
    Guatemala: 'America/Guatemala',
    El_Salvador: 'America/El_Salvador',
    Santo_Domingo: 'America/Santo_Domingo',
    Havana: 'America/Havana',
    Costa_Rica: 'America/Costa_Rica',
    Belize: 'America/Belize',
    Barbados: 'America/Barbados',
    Tijuana: 'America/Tijuana',
    Bahia_Banderas: 'America/Bahia_Banderas',
    Mazatlan: 'America/Mazatlan',
    Hermosillo: 'America/Hermosillo',
    Chihuahua: 'America/Chihuahua',
    Ojinaga: 'America/Ojinaga',
    Mexico_City: 'America/Mexico_City',
    Monterrey: 'America/Monterrey',
    Matamoros: 'America/Matamoros',
    Merida: 'America/Merida',
    Cancun: 'America/Cancun',
    Dawson: 'America/Dawson',
    Whitehorse: 'America/Whitehorse',
    Inuvik: 'America/Inuvik',
    Yellowknife: 'America/Yellowknife',
    Cambridge_Bay: 'America/Cambridge_Bay',
    Rankin_Inlet: 'America/Rankin_Inlet',
    Resolute: 'America/Resolute',
    Iqaluit: 'America/Iqaluit',
    Pangnirtung: 'America/Pangnirtung',
    Fort_Nelson: 'America/Fort_Nelson',
    Dawson_Creek: 'America/Dawson_Creek',
    Vancouver: 'America/Vancouver',
    Edmonton: 'America/Edmonton',
    Swift_Current: 'America/Swift_Current',
    Regina: 'America/Regina',
    Winnipeg: 'America/Winnipeg',
    Rainy_River: 'America/Rainy_River',
    Nipigon: 'America/Nipigon',
    Thunder_Bay: 'America/Thunder_Bay',
    Toronto: 'America/Toronto',
    Moncton: 'America/Moncton',
    Glace_Bay: 'America/Glace_Bay',
    Halifax: 'America/Halifax',
    Goose_Bay: 'America/Goose_Bay',
    St_Johns: 'America/St_Johns',
    Menominee: 'America/Menominee',
    Detroit: 'America/Detroit',
    Monticello: 'America/Kentucky/Monticello',
    Louisville: 'America/Kentucky/Louisville',
    Vevay: 'America/Indiana/Vevay',
    Winamac: 'America/Indiana/Winamac',
    Knox: 'America/Indiana/Knox',
    Petersburg: 'America/Indiana/Petersburg',
    Tell_City: 'America/Indiana/Tell_City',
    Vincennes: 'America/Indiana/Vincennes',
    Marengo: 'America/Indiana/Marengo',
    Indianapolis: 'America/Indiana/Indianapolis',
    Boise: 'America/Boise',
    Phoenix: 'America/Phoenix',
    Adak: 'America/Adak',
    Nome: 'America/Nome',
    Anchorage: 'America/Anchorage',
    Yakutat: 'America/Yakutat',
    Metlakatla: 'America/Metlakatla',
    Sitka: 'America/Sitka',
    Juneau: 'America/Juneau',
    Los_Angeles: 'America/Los_Angeles',
    Denver: 'America/Denver',
    Beulah: 'America/North_Dakota/Beulah',
    New_Salem: 'America/North_Dakota/New_Salem',
    Center: 'America/North_Dakota/Center',
    Chicago: 'America/Chicago',
    New_York: 'America/New_York',
    Ceuta: 'Africa/Ceuta',
    Thule: 'America/Thule',
    Nuuk: 'America/Nuuk',
    Scoresbysund: 'America/Scoresbysund',
    Danmarkshavn: 'America/Danmarkshavn',
    Tortola: 'America/Tortola',
    St_Vincent: 'America/St_Vincent',
    St_Thomas: 'America/St_Thomas',
    St_Lucia: 'America/St_Lucia',
    St_Kitts: 'America/St_Kitts',
    Rosario: 'America/Rosario',
    Port_of_Spain: 'America/Port_of_Spain',
    Nassau: 'America/Nassau',
    Montserrat: 'America/Montserrat',
    Montreal: 'America/Montreal',
    Guadeloupe: 'America/Guadeloupe',
    Grenada: 'America/Grenada',
    Ensenada: 'America/Ensenada',
    Dominica: 'America/Dominica',
    Curacao: 'America/Curacao',
    Creston: 'America/Creston',
    Coral_Harbour: 'America/Coral_Harbour',
    Cayman: 'America/Cayman',
    BlancSablon: 'America/Blanc-Sablon',
    Atikokan: 'America/Atikokan',
    Aruba: 'America/Aruba',
    ComodRivadavia: 'America/Argentina/ComodRivadavia',
    Antigua: 'America/Antigua',
    Anguilla: 'America/Anguilla',
    Abidjan: 'Africa/Abidjan',
    Accra: 'Africa/Accra',
    Addis_Ababa: 'Africa/Addis_Ababa',
    Algiers: 'Africa/Algiers',
    Asmara: 'Africa/Asmara',
    Bamako: 'Africa/Bamako',
    Bangui: 'Africa/Bangui',
    Banjul: 'Africa/Banjul',
    Bissau: 'Africa/Bissau',
    Blantyre: 'Africa/Blantyre',
    Brazzaville: 'Africa/Brazzaville',
    Bujumbura: 'Africa/Bujumbura',
    Cairo: 'Africa/Cairo',
    Casablanca: 'Africa/Casablanca',
    Conakry: 'Africa/Conakry',
    Dakar: 'Africa/Dakar',
    Dar_es_Salaam: 'Africa/Dar_es_Salaam',
    Djibouti: 'Africa/Djibouti',
    Douala: 'Africa/Douala',
    El_Aaiun: 'Africa/El_Aaiun',
    Freetown: 'Africa/Freetown',
    Gaborone: 'Africa/Gaborone',
    Harare: 'Africa/Harare',
    Johannesburg: 'Africa/Johannesburg',
    Juba: 'Africa/Juba',
    Kampala: 'Africa/Kampala',
    Khartoum: 'Africa/Khartoum',
    Kigali: 'Africa/Kigali',
    Kinshasa: 'Africa/Kinshasa',
    Lagos: 'Africa/Lagos',
    Libreville: 'Africa/Libreville',
    Lome: 'Africa/Lome',
    Luanda: 'Africa/Luanda',
    Lubumbashi: 'Africa/Lubumbashi',
    Lusaka: 'Africa/Lusaka',
    Malabo: 'Africa/Malabo',
    Maputo: 'Africa/Maputo',
    Maseru: 'Africa/Maseru',
    Mbabane: 'Africa/Mbabane',
    Mogadishu: 'Africa/Mogadishu',
    Monrovia: 'Africa/Monrovia',
    Nairobi: 'Africa/Nairobi',
    Ndjamena: 'Africa/Ndjamena',
    Niamey: 'Africa/Niamey',
    Nouakchott: 'Africa/Nouakchott',
    Ouagadougou: 'Africa/Ouagadougou',
    PortoNovo: 'Africa/Porto-Novo',
    Sao_Tome: 'Africa/Sao_Tome',
    Timbuktu: 'Africa/Timbuktu',
    Tripoli: 'Africa/Tripoli',
    Tunis: 'Africa/Tunis',
    Windhoek: 'Africa/Windhoek',
    Casey: 'Antarctica/Casey',
    Davis: 'Antarctica/Davis',
    DumontDUrville: 'Antarctica/DumontDUrville',
    Macquarie: 'Antarctica/Macquarie',
    Mawson: 'Antarctica/Mawson',
    McMurdo: 'Antarctica/McMurdo',
    Palmer: 'Antarctica/Palmer',
    Rothera: 'Antarctica/Rothera',
    Syowa: 'Antarctica/Syowa',
    Troll: 'Antarctica/Troll',
    Vostok: 'Antarctica/Vostok',
    Aden: 'Asia/Aden',
    Almaty: 'Asia/Almaty',
    Amman: 'Asia/Amman',
    Anadyr: 'Asia/Anadyr',
    Aqtau: 'Asia/Aqtau',
    Aqtobe: 'Asia/Aqtobe',
    Ashgabat: 'Asia/Ashgabat',
    Atyrau: 'Asia/Atyrau',
    Baghdad: 'Asia/Baghdad',
    Bahrain: 'Asia/Bahrain',
    Baku: 'Asia/Baku',
    Bangkok: 'Asia/Bangkok',
    Barnaul: 'Asia/Barnaul',
    Beirut: 'Asia/Beirut',
    Bishkek: 'Asia/Bishkek',
    Brunei: 'Asia/Brunei',
    Chita: 'Asia/Chita',
    Choibalsan: 'Asia/Choibalsan',
    Chongqing: 'Asia/Chongqing',
    Colombo: 'Asia/Colombo',
    Damascus: 'Asia/Damascus',
    Dhaka: 'Asia/Dhaka',
    Dili: 'Asia/Dili',
    Dubai: 'Asia/Dubai',
    Dushanbe: 'Asia/Dushanbe',
    Famagusta: 'Asia/Famagusta',
    Gaza: 'Asia/Gaza',
    Hanoi: 'Asia/Hanoi',
    Harbin: 'Asia/Harbin',
    Hebron: 'Asia/Hebron',
    Ho_Chi_Minh: 'Asia/Ho_Chi_Minh',
    Hong_Kong: 'Asia/Hong_Kong',
    Hovd: 'Asia/Hovd',
    Irkutsk: 'Asia/Irkutsk',
    Jakarta: 'Asia/Jakarta',
    Jayapura: 'Asia/Jayapura',
    Jerusalem: 'Asia/Jerusalem',
    Kabul: 'Asia/Kabul',
    Kamchatka: 'Asia/Kamchatka',
    Karachi: 'Asia/Karachi',
    Kashgar: 'Asia/Kashgar',
    Kathmandu: 'Asia/Kathmandu',
    Khandyga: 'Asia/Khandyga',
    Kolkata: 'Asia/Kolkata',
    Krasnoyarsk: 'Asia/Krasnoyarsk',
    Kuala_Lumpur: 'Asia/Kuala_Lumpur',
    Kuching: 'Asia/Kuching',
    Kuwait: 'Asia/Kuwait',
    Macau: 'Asia/Macau',
    Magadan: 'Asia/Magadan',
    Makassar: 'Asia/Makassar',
    Manila: 'Asia/Manila',
    Muscat: 'Asia/Muscat',
    Nicosia: 'Asia/Nicosia',
    Novokuznetsk: 'Asia/Novokuznetsk',
    Novosibirsk: 'Asia/Novosibirsk',
    Omsk: 'Asia/Omsk',
    Oral: 'Asia/Oral',
    Phnom_Penh: 'Asia/Phnom_Penh',
    Pontianak: 'Asia/Pontianak',
    Pyongyang: 'Asia/Pyongyang',
    Qatar: 'Asia/Qatar',
    Qostanay: 'Asia/Qostanay',
    Qyzylorda: 'Asia/Qyzylorda',
    Riyadh: 'Asia/Riyadh',
    Sakhalin: 'Asia/Sakhalin',
    Samarkand: 'Asia/Samarkand',
    Seoul: 'Asia/Seoul',
    Shanghai: 'Asia/Shanghai',
    Singapore: 'Asia/Singapore',
    Srednekolymsk: 'Asia/Srednekolymsk',
    Taipei: 'Asia/Taipei',
    Tashkent: 'Asia/Tashkent',
    Tbilisi: 'Asia/Tbilisi',
    Tehran: 'Asia/Tehran',
    Tel_Aviv: 'Asia/Tel_Aviv',
    Thimphu: 'Asia/Thimphu',
    Tokyo: 'Asia/Tokyo',
    Tomsk: 'Asia/Tomsk',
    Ulaanbaatar: 'Asia/Ulaanbaatar',
    Urumqi: 'Asia/Urumqi',
    UstNera: 'Asia/Ust-Nera',
    Vientiane: 'Asia/Vientiane',
    Vladivostok: 'Asia/Vladivostok',
    Yakutsk: 'Asia/Yakutsk',
    Yangon: 'Asia/Yangon',
    Yekaterinburg: 'Asia/Yekaterinburg',
    Yerevan: 'Asia/Yerevan',
    Azores: 'Atlantic/Azores',
    Bermuda: 'Atlantic/Bermuda',
    Canary: 'Atlantic/Canary',
    Cape_Verde: 'Atlantic/Cape_Verde',
    Faroe: 'Atlantic/Faroe',
    Jan_Mayen: 'Atlantic/Jan_Mayen',
    Madeira: 'Atlantic/Madeira',
    Reykjavik: 'Atlantic/Reykjavik',
    South_Georgia: 'Atlantic/South_Georgia',
    St_Helena: 'Atlantic/St_Helena',
    Stanley: 'Atlantic/Stanley',
    Adelaide: 'Australia/Adelaide',
    Brisbane: 'Australia/Brisbane',
    Broken_Hill: 'Australia/Broken_Hill',
    Currie: 'Australia/Currie',
    Darwin: 'Australia/Darwin',
    Eucla: 'Australia/Eucla',
    Hobart: 'Australia/Hobart',
    Lindeman: 'Australia/Lindeman',
    Lord_Howe: 'Australia/Lord_Howe',
    Melbourne: 'Australia/Melbourne',
    Perth: 'Australia/Perth',
    Sydney: 'Australia/Sydney',
    Amsterdam: 'Europe/Amsterdam',
    Andorra: 'Europe/Andorra',
    Astrakhan: 'Europe/Astrakhan',
    Athens: 'Europe/Athens',
    Belfast: 'Europe/Belfast',
    Belgrade: 'Europe/Belgrade',
    Berlin: 'Europe/Berlin',
    Brussels: 'Europe/Brussels',
    Bucharest: 'Europe/Bucharest',
    Budapest: 'Europe/Budapest',
    Chisinau: 'Europe/Chisinau',
    Copenhagen: 'Europe/Copenhagen',
    Dublin: 'Europe/Dublin',
    Gibraltar: 'Europe/Gibraltar',
    Guernsey: 'Europe/Guernsey',
    Helsinki: 'Europe/Helsinki',
    Isle_of_Man: 'Europe/Isle_of_Man',
    Istanbul: 'Europe/Istanbul',
    Jersey: 'Europe/Jersey',
    Kaliningrad: 'Europe/Kaliningrad',
    Kiev: 'Europe/Kiev',
    Kirov: 'Europe/Kirov',
    Lisbon: 'Europe/Lisbon',
    Ljubljana: 'Europe/Ljubljana',
    London: 'Europe/London',
    Luxembourg: 'Europe/Luxembourg',
    Madrid: 'Europe/Madrid',
    Malta: 'Europe/Malta',
    Minsk: 'Europe/Minsk',
    Monaco: 'Europe/Monaco',
    Moscow: 'Europe/Moscow',
    Oslo: 'Europe/Oslo',
    Paris: 'Europe/Paris',
    Prague: 'Europe/Prague',
    Riga: 'Europe/Riga',
    Rome: 'Europe/Rome',
    Samara: 'Europe/Samara',
    Sarajevo: 'Europe/Sarajevo',
    Saratov: 'Europe/Saratov',
    Simferopol: 'Europe/Simferopol',
    Skopje: 'Europe/Skopje',
    Sofia: 'Europe/Sofia',
    Stockholm: 'Europe/Stockholm',
    Tallinn: 'Europe/Tallinn',
    Tirane: 'Europe/Tirane',
    Tiraspol: 'Europe/Tiraspol',
    Ulyanovsk: 'Europe/Ulyanovsk',
    Uzhgorod: 'Europe/Uzhgorod',
    Vaduz: 'Europe/Vaduz',
    Vienna: 'Europe/Vienna',
    Vilnius: 'Europe/Vilnius',
    Volgograd: 'Europe/Volgograd',
    Warsaw: 'Europe/Warsaw',
    Zagreb: 'Europe/Zagreb',
    Zaporozhye: 'Europe/Zaporozhye',
    Zurich: 'Europe/Zurich',
    Antananarivo: 'Indian/Antananarivo',
    Chagos: 'Indian/Chagos',
    Christmas: 'Indian/Christmas',
    Cocos: 'Indian/Cocos',
    Comoro: 'Indian/Comoro',
    Kerguelen: 'Indian/Kerguelen',
    Mahe: 'Indian/Mahe',
    Maldives: 'Indian/Maldives',
    Mauritius: 'Indian/Mauritius',
    Mayotte: 'Indian/Mayotte',
    Reunion: 'Indian/Reunion',
    Apia: 'Pacific/Apia',
    Auckland: 'Pacific/Auckland',
    Bougainville: 'Pacific/Bougainville',
    Chatham: 'Pacific/Chatham',
    Chuuk: 'Pacific/Chuuk',
    Easter: 'Pacific/Easter',
    Efate: 'Pacific/Efate',
    Enderbury: 'Pacific/Enderbury',
    Fakaofo: 'Pacific/Fakaofo',
    Fiji: 'Pacific/Fiji',
    Funafuti: 'Pacific/Funafuti',
    Galapagos: 'Pacific/Galapagos',
    Gambier: 'Pacific/Gambier',
    Guadalcanal: 'Pacific/Guadalcanal',
    Guam: 'Pacific/Guam',
    Honolulu: 'Pacific/Honolulu',
    Johnston: 'Pacific/Johnston',
    Kanton: 'Pacific/Kanton',
    Kiritimati: 'Pacific/Kiritimati',
    Kosrae: 'Pacific/Kosrae',
    Kwajalein: 'Pacific/Kwajalein',
    Majuro: 'Pacific/Majuro',
    Marquesas: 'Pacific/Marquesas',
    Midway: 'Pacific/Midway',
    Nauru: 'Pacific/Nauru',
    Niue: 'Pacific/Niue',
    Norfolk: 'Pacific/Norfolk',
    Noumea: 'Pacific/Noumea',
    Pago_Pago: 'Pacific/Pago_Pago',
    Palau: 'Pacific/Palau',
    Pitcairn: 'Pacific/Pitcairn',
    Pohnpei: 'Pacific/Pohnpei',
    Port_Moresby: 'Pacific/Port_Moresby',
    Rarotonga: 'Pacific/Rarotonga',
    Saipan: 'Pacific/Saipan',
    Tahiti: 'Pacific/Tahiti',
    Tarawa: 'Pacific/Tarawa',
    Tongatapu: 'Pacific/Tongatapu',
    Wake: 'Pacific/Wake',
    Wallis: 'Pacific/Wallis',
};

/**
 * Converts a date to the specified time zone, returning the respective string.
 *
 * @param date - Date to convert.
 * @param timeZone - Time zone to which the date should be converted.
 * @param [options]
 * @param [locale] - Locale (language/location) to use when generating the date-time string.
 *
 * @see [Date.prototype.toLocaleString `timeZone` docs]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#timezone}
 * @see [Related `timeZoneName` docs]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#timezonename}
 */
export function dateToTimeZoneString(date: Date, timeZone: ValueOf<typeof TimeZones>, {
    locale,
}: {
    locale?: string | string[];
} = {}) {
    return date.toLocaleString(locale, {
        timeZone,
    });
}
