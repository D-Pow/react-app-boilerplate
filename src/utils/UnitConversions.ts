export function celsiusFahrenheit({
    c,
    f,
}: {
    c?: number;
    f?: number;
} = {}) {
    if (!c && !f) {
        throw new TypeError('Either `c` or `f` must be specified');
    }

    if (c) {
        return (c * 9/5) + 32;
    }

    if (f) {
        return (f - 32) * 5/9;
    }

    return NaN;
}


export function kilogramsPounds({
    kg,
    lbs,
}: {
    kg?: number;
    lbs?: number;
} = {}) {
    if (!kg && !lbs) {
        throw new TypeError('Either `kg` or `lbs` must be specified');
    }

    if (lbs) {
        return lbs * 0.453592;
    }

    if (kg) {
        return kg * 2.20462;
    }

    return NaN;
}


export function ouncesPounds({
    oz,
    lbs,
}: {
    oz?: number;
    lbs?: number;
} = {}) {
    if (!oz && !lbs) {
        throw new TypeError('Either `oz` or `lbs` must be specified');
    }

    if (oz) {
        return oz / 16;
    }

    if (lbs) {
        return lbs * 16;
    }

    return NaN;
}


export function gramsOunces({
    g,
    oz,
}: {
    g?: number;
    oz?: number;
} = {}) {
    if (!g && !oz) {
        throw new TypeError('Either `g` or `oz` must be specified');
    }

    if (g) {
        return g * 0.035274;
    }

    if (oz) {
        return oz * 28.3495;
    }

    return NaN;
}


export function ouncesMilliliters({
    oz,
    ml,
}: {
    oz?: number;
    ml?: number;
} = {}) {
    if (!oz && !ml) {
        throw new TypeError('Either `oz` or `ml` must be specified');
    }

    if (oz) {
        return oz * 29.5735;
    }

    if (ml) {
        return ml * 0.033814;
    }

    return NaN;
}
