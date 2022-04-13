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

    const kgToLbsRatio = 2.20462;

    if (lbs) {
        return lbs * (1 / kgToLbsRatio); // ~ 0.453592
    }

    if (kg) {
        return kg * kgToLbsRatio;
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

    const ozToLbsRatio = 16;

    if (oz) {
        return oz * (1 / ozToLbsRatio);
    }

    if (lbs) {
        return lbs * ozToLbsRatio;
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

    const gToOzRatio = 28.3495;

    if (g) {
        return g * (1 / gToOzRatio);
    }

    if (oz) {
        return oz * gToOzRatio;
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

    const mlToOzRatio = 0.033814;

    if (oz) {
        return oz * (1 / mlToOzRatio);
    }

    if (ml) {
        return ml * mlToOzRatio;
    }

    return NaN;
}
