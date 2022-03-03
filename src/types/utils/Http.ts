import type { IncomingHttpHeaders } from 'http';


/**
 * HTTP headers for better IDE autocompletion.
 *
 * @see [Inspiration]{@link https://dev.to/tmlr/til-get-strongly-typed-http-headers-with-typescript-3e33}
 */
export type HttpHeaders = IncomingHttpHeaders & { [header: string]: string; };
export type FetchRequestConfig = RequestInit | { body: Record<string, unknown>; } | { headers: HttpHeaders; };
