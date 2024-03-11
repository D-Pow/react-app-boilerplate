import type {
    Indexable,
} from '@/types';


export function decodeJwt(jwt: string, { header = true, payload = false, signature = false }): string | Indexable;
export function decodeJwt(jwt: string, { header = false, payload = true, signature = false }): string | Indexable;
export function decodeJwt(jwt: string, { header = false, payload = false, signature = true }): string | Indexable;
export function decodeJwt(jwt: string, { header = true, payload = true, signature = false }): Array<string | Indexable>;
export function decodeJwt(jwt: string, { header = true, payload = false, signature = true }): Array<string | Indexable>;
export function decodeJwt(jwt: string, { header = false, payload = true, signature = true }): Array<string | Indexable>;
export function decodeJwt(jwt: string, { header = true, payload = true, signature = true }): Array<string | Indexable>;
/**
 * Decodes a JWT.
 *
 * @param jwt - JWT to decode;
 * @param [options]
 * @param [options.header] - If the header should be included in return output.
 * @param [options.payload] - If the payload should be included in return output.
 * @param [options.signature] - If the signature should be included in return output.
 *
 * @see [Inspiration code]{@link https://github.com/auth0/jwt-decode/blob/main/lib/index.ts}
 */
export function decodeJwt(jwt: string, {
    header = false,
    payload = true,
    signature = false,
} = {}): string | Indexable | (string | Indexable)[] {
    function base64UrlDecode(str: string) {
        let jwtWithValidChars = str.replace(/-/g, '+').replace(/_/g, '/');

        switch (jwtWithValidChars.length % 4 ) {
            case 0:
                break;
            case 2:
                jwtWithValidChars += '==';
                break;
            case 3:
                jwtWithValidChars += '=';
                break;
            default:
                break;
        }

        try {
            jwtWithValidChars = decodeURIComponent(atob(jwtWithValidChars).replace(/(.)/g, (fullStringMatch, matchGroup) => {
                let code = matchGroup.charCodeAt(0).toString(16).toUpperCase();

                if (code.length < 2) {
                    code = "0" + code;
                }

                return "%" + code;
            }));
        } catch(decodeURIComponentError) {
            try {
                jwtWithValidChars = atob(jwtWithValidChars);
            } catch (atobError) {}
        }

        return jwtWithValidChars;
    }

    const jwtParsedList: string[] = jwt.split(/\./g)
        .map(str => {
            return base64UrlDecode(str);
        });

    const jwtParsedFilteredByDesiredParts = [ header, payload, signature ]
        .map((entrySelect, i) => {
            if (entrySelect) {
                let jwtPart = jwtParsedList[i];

                try {
                    jwtPart = JSON.parse(jwtPart);
                } catch (notJsonError) {}

                return jwtPart;
            }
        })
        .filter(Boolean);

    if (jwtParsedFilteredByDesiredParts.length === 1) {
        return jwtParsedFilteredByDesiredParts[0];
    }

    return jwtParsedFilteredByDesiredParts;
}
