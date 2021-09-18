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

export function getDate(dateStr) {
    if (!dateStr) {
        return new Date();
    }

    return new Date(Date.parse(dateStr));
}

export function getNumDaysBetween(earlierDateStr, laterDateStr, asDate = true) {
    const earlierDate = getDate(earlierDateStr);
    const laterDate = getDate(laterDateStr);

    return (laterDate - earlierDate) / TimeInMillis.Days;
}
