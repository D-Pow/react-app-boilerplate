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


export function getNumDaysBetween(earlierDateStr: string | number | Date, laterDateStr: string | number | Date, asDate = true) {
    const earlierDate = new Date(earlierDateStr);
    const laterDate = new Date(laterDateStr);

    return (laterDate.valueOf() - earlierDate.valueOf()) / TimeInMillis.Days;
}
