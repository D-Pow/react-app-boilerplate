#!/usr/bin/env -S npx ts-node
// #!/usr/bin/env -S node --loader ts-node/esm --experimental-top-level-await
/* globals NodeJS */

import {
    createServer as createHttpServer,
    get as httpGet,
    type ClientRequest,
    type IncomingMessage,
    type OutgoingHttpHeaders,
} from 'http';
import {
    createServer as createHttpsServer,
    get as httpsGet,
    Agent as HttpsAgent,
} from 'https';

import 'isomorphic-fetch';

import {
    Paths,
    openWithDefaultApp,
    parseCliArgs,
    getServerHttpsCredentials,
} from '~/config/utils';


type CreateServer = (
    typeof createHttpServer
    | typeof createHttpsServer
    | (
        (...args: any[]) => ReturnType<typeof createHttpServer | typeof createHttpsServer>
    )
);
type Get = (
    typeof httpGet
    | typeof httpsGet
);


interface ServerConfigs {
    /**
     * Array of option flags and/or arguments.
     */
    argv?: string[];
}

interface ServerOptions {
    openBrowserOnBoot: boolean;
    proxyApis?: string[];
    proxyServerUrl?: string;
    mock?: boolean;
    certLifetime: number;
    certRefresh?: boolean;
    protocol: string;
    port: number;
    domain: string;
    hostname: string;
    isHttps: boolean;
    production: boolean;
    dev: boolean;
    args?: unknown[];
    unknownOptions?: unknown[];
}

/**
 * Configures options for the dev-server.
 */
function configureServer({
    argv,
}: ServerConfigs = {}): ServerOptions {
    const parsedArgs = parseCliArgs({
        argv,
        helpMessage: 'Runs a dev-server with QoL customizations, including proxying API calls to Prod vs local back-end server, opening the browser on dev-server boot, etc.',
        optionsConfigs: {
            openBrowserOnBoot: {
                description: 'If the browser should be opened when the dev-server boots.',
                aliases: [ 'o', 'open' ],
                defaultValue: true,
            },
            proxyApis: {
                description: 'Network API paths to be proxied to another server instead of this one.',
                type: 'array',
                aliases: [ 'proxy' ],
            },
            proxyServerUrl: {
                description: 'Server to which proxied API paths should be forwarded.',
                type: 'string',
                numArgs: 1,
                aliases: [ 'server' ],
            },
            mock: {
                description: 'Mocks (specified or default=all) endpoints from the `mocks/` dir.',
                type: 'array',
            },
            protocol: {
                description: 'Protocol to use for the dev-server.',
                numArgs: 1,
                defaultValue: process.env.PROTOCOL || 'http',
            },
            port: {
                description: 'Port to use for the dev-server.',
                numArgs: 1,
                defaultValue: process.env.PORT || 3000,
                aliases: [ 'p' ],
            },
            domain: {
                description: 'Domain (without protocol or port) on which to run the dev-server.',
                numArgs: 1,
                defaultValue: process.env.DOMAIN || 'localhost',
                aliases: [ 'd' ],
            },
            certLifetime: {
                description: 'How many days the HTTPS certificate should be valid (default: 1 year).',
                numArgs: 1,
                defaultValue: 365,
                aliases: [ 'cert-days-valid' ],
            },
            certRefresh: {
                description: 'Delete the old self-signed HTTPS certificate and create a new one.',
            },
            production: {
                description: 'Run dev-server in production mode.',
                defaultValue: process.env.NODE_ENV === 'production',
                aliases: [ 'prod' ],
            },
            help: {
                description: 'Print this message and exit.',
                aliases: [ 'h' ],
            },
        },
    });

    const {
        production,
        openBrowserOnBoot,
        proxyApis,
        proxyServerUrl,
        mock,
        certLifetime,
        certRefresh,
        protocol,
        port,
        domain,
        _: args, // Positional args without flags
        ...unknownOptions // Unknown options/flags
    } = parsedArgs;

    const serverConfigs = {
        production,
        openBrowserOnBoot,
        proxyApis,
        proxyServerUrl,
        mock,
        certLifetime,
        certRefresh,
        protocol,
        port,
        domain,
        hostname: process.env.HOSTNAME || `${protocol}://${domain}${port ? `:${port}` : ''}`,
        isHttps: protocol.match(/https/i),
        dev: !production,
        args,
        unknownOptions,
    };

    return serverConfigs as ServerOptions;
}

const {
    openBrowserOnBoot,
    proxyApis,
    proxyServerUrl,
    mock,
    certLifetime,
    certRefresh,
    protocol,
    port,
    domain,
    hostname,
    isHttps,
    dev,
} = configureServer();



let createServer: CreateServer = createHttpServer;
let get: Get = httpGet;
let httpsOptions: Awaited<ReturnType<typeof getServerHttpsCredentials>>;

async function setCreateServerFunctionFromProtocol() {
    if (isHttps) {
        httpsOptions = await getServerHttpsCredentials({
            certOptions: {
                validityDays: certLifetime,
            },
            force: certRefresh,
        });

        createServer = createHttpsServer.bind(null, httpsOptions);
        get = httpsGet;
    }
}



/**
 * Checks if the supplied URL should be proxied to the specified server.
 *
 * Converts the REST/glob format of the specified API paths to regex for manual checking against
 * plain strings.
 */
function shouldProxyUrl(url: string): boolean {
    if (!proxyApis?.length) {
        return false;
    }

    if (!shouldProxyUrl.proxyApiRegex) {
        shouldProxyUrl.proxyApiRegex = new RegExp(`(${proxyApis
            .map(route => route
                .replace(
                    /:[^/]+/g, // Match all REST path-matchers, e.g. `:slug` and `:slug*`
                    '[^/]+/?\\??', // Replace with regex matching anything other than slashes, taking care of both `:slug` and `:slug*` (`/path/:slug*` => `/path/any/level/of/nesting`)
                )
                .replace(
                    /\*\*?/g, // Match glob patterns for capture-all
                    '.*', // Replace with regex
                ),
            )
            .join(')|(') // Segregate each URL path so that regex matches don't bleed over from one to the next
        })`);
    }

    return shouldProxyUrl.proxyApiRegex.test(url);
}
namespace shouldProxyUrl { // Define custom field on function
    export let proxyApiRegex: RegExp;
}

/**
 * Modifies an incoming request object to pass through a CORS proxy, changing the relevant headers
 * to look like they came from the specified server.
 *
 * Headers include:
 * - Origin
 * - Referer
 * - Host
 */
function modifyRequestWithCorsProxy(request: IncomingMessage) {
    // Avoid being forced to use `req.url!` to show the URL is defined by marking all fields of `req` as required
    const req = request as Required<IncomingMessage>;

    // `req.url` is pathname + query string
    const requestUrl = new URL(req.url, hostname);

    if (shouldProxyUrl(req.url)) {
        // Rewrite headers to make it look like it came from the desired destination instead of localhost.
        // This is much simpler to do than using a nested Express server (see: https://stackoverflow.com/questions/60925133/proxy-to-backend-with-default-next-js-dev-server).
        const corsProxyUrl = new URL(req.url, proxyServerUrl);

        req.headers.origin = corsProxyUrl.origin;
        req.headers.referer = corsProxyUrl.origin;
        req.headers.host = corsProxyUrl.host;

        return corsProxyUrl;
    }

    return requestUrl;
}



async function getIncomingMessageBody<
    T = string
        | { [key: string | number | symbol]: unknown }
        | unknown
>(req: IncomingMessage): Promise<T> {
    req.setEncoding('utf-8');

    const rawData: T[] = [];

    return await new Promise<T>((resolve, reject) => {
        req.on('data', rawData.push.bind(rawData));

        req.on('end', () => {
            let receivedData: string = rawData.join('');

            try {
                receivedData = JSON.parse(receivedData);
            } catch (jsonParsingError) {}

            resolve(receivedData as unknown as T);
        });
    });
}



// If using vanilla `http(s)` server
async function runVanillaNodeServer() {
    // See: https://www.digitalocean.com/community/tutorials/how-to-create-a-web-server-in-node-js-with-the-http-module
    try {
        const server = createServer(async (request, res) => {
            const req = request as Required<IncomingMessage>;

            if (shouldProxyUrl(req.url)) {
                const reqBody = await getIncomingMessageBody(req);
                const reqBodyString = (
                    typeof reqBody === typeof ''
                        ? reqBody
                        : JSON.stringify(reqBody)
                ) as string;

                const corsProxyUrl = modifyRequestWithCorsProxy(req);
                const corsResponse = await fetch(corsProxyUrl.toString(), {
                    method: req.method,
                    headers: { ...req.headers } as HeadersInit,
                    credentials: 'include',
                    mode: 'cors',
                    ...(() => (req.method?.match(/(GET|HEAD)/i) || !reqBody)
                        ? {}
                        : {
                            body: reqBodyString,
                        }
                    )(),
                });
                const corsResponseHeaders = [ ...corsResponse.headers.entries() ]
                    .reduce((obj, [ key, value ]) => {
                        // Don't copy `Content-Encoding`, `Transfer-Encoding`, etc. as those are set
                        // by this NodeJS server.
                        if (!key.match(/(\w+-encoding$)/i)) {
                            obj[key] = value;
                        }

                        return obj;
                    }, {} as OutgoingHttpHeaders);
                let corsResponseBody: string | Record<string | number | symbol, unknown> = await corsResponse.text();
                const corsResponseBodyString: string = corsResponseBody;

                try {
                    // `isomorphic-fetch` uses `node-fetch@2` under the hood, which doesn't support `response.clone()`
                    // so parse the JSON manually if possible.
                    // See: https://github.com/node-fetch/node-fetch/blob/main/docs/v2-LIMITS.md
                    corsResponseBody = JSON.parse(corsResponseBody);
                } catch (bodyNotJsonError) {}

                res.writeHead(corsResponse.status, corsResponseHeaders);
                res.end(corsResponseBodyString);

                return;
            }

            // TODO Use your custom server logic here
            res.writeHead(200, {
                'Content-Type': 'application/json',
            });

            const response = JSON.stringify({
                data: 'Hello world!',
            });

            res.end(response);
        });

        return await new Promise<void>((res, rej) => {
            server.listen(port, domain, () => {
                console.log(`Dev server ready! Running at: ${hostname}`);

                if (openBrowserOnBoot) {
                    openWithDefaultApp(hostname);
                }

                res();
            });

            // Alternatively:
            // server.addListener('listening', () => {
            //     // Custom hostname, port, etc. configuration
            //     res();
            // });

            server.addListener('error', (error: NodeJS.ErrnoException) => {
                rej(error);
            });
        });
    } catch (couldntStartServerError) {
        console.error(couldntStartServerError);
        process.exit(1);
    }
}

// If wanting to verify the server is running correctly
async function verifyServerIsRunning() {
    async function verifyWithNodeRequest() {
        const verifyServerClientRequest: ClientRequest = get(hostname, async (req: IncomingMessage) => {
            const { statusCode = 400 } = req;
            const contentType = req.headers['content-type'] || 'text/plain';

            const acceptableContentTypes = [
                'text/plain',
                'text/html',
                'application/json',
            ];

            let error;
            // Check for errors first.
            // Any 2xx status code signals a successful response
            if (statusCode < 200 && statusCode > 300) {
                error = new Error(`Request Failed! Status Code: [${statusCode}], Content-Type: [${contentType}].`);
            } else if (
                !acceptableContentTypes.some(requestContentType => new RegExp(requestContentType).test(contentType))
            ) {
                error = new Error(`Invalid content-type! Expected one of [${acceptableContentTypes.join(', ')}] but received ${contentType}`);
            }

            if (error) {
                console.error(error.message);

                // Consume response data to free up memory
                req.resume();

                return;
            }

            const body = await getIncomingMessageBody(req);

            console.log('Server response from root `/` =', body);

            return;

            // Alternatively:
            // import { type RequestOptions as HttpRequestOptions } from 'http';
            // import { request as httpsRequest, type RequestOptions as HttpsRequestOptions } from 'https';
            // await new Promise<void>((resolve, reject) => {
            //     (async () => {
            //         const options: HttpRequestOptions | HttpsRequestOptions = {
            //             hostname: corsProxyUrl.hostname,
            //             path: req.url,
            //             method: req.method,
            //             headers: req.headers,
            //             agent: false,
            //             setHost: false,
            //             // @ts-ignore
            //             insecureHTTPParser: true,
            //             rejectUnauthorized: false,
            //         };
            //         // @ts-ignore
            //         // options.agent = new HttpsAgent(options);
            //         const req2 = httpsRequest(
            //             corsProxyUrl.toString(),
            //             options,
            //             async res1 => {
            //                 console.log({
            //                     httpsRequest: corsProxyUrl.toString(),
            //                     httpsReqHeaders: res1.headers,
            //                     httpsReqBody: await getIncomingMessageBody(res1),
            //                 });
            //
            //                 resolve();
            //             },
            //         );
            //
            //         req2.write(reqBodyString);
            //         req2.end();
            //     })();
            // });
        });

        verifyServerClientRequest.on('error', (error) => {
            console.error(`Got error: ${error.message}`);
        });
    }

    async function verifyWithFetch() {
        try {
            const res = await fetch(hostname, {
                ...(protocol.match(/https/i)
                    ? {
                        // Force accepting self-signed certs. See: https://sebtrif.xyz/blog/2019-10-03-client-side-ssl-in-node-js-with-fetch/
                        agent: new HttpsAgent({
                            rejectUnauthorized: false,
                        }),
                    } as RequestInit
                    : {}
                ),
            });
            const { ok: isSuccess, status } = res;

            if (!isSuccess) {
                throw new Error(`Could not make network request to ${hostname}! Got HTTP status code [${status}]`);
            }

            let body = await res.text();

            try {
                body = JSON.parse(body);
            } catch (jsonParsingError) {
                // If not JSON, then shorten HTML text response
                body = body?.slice(0, 30);
            }

            console.log('Server is running! Response from root `/` =', body);
        } catch (e) {
            console.error('Could not verify that server is running!', e);
        }
    }

    async function verify(useNodeGetRequest = false) {
        if (useNodeGetRequest) {
            return await verifyWithNodeRequest();
        }

        return await verifyWithFetch();
    }

    return await new Promise<unknown>((res, rej) => {
        setTimeout(async () => {
            try {
                res(await verify());
            } catch (e) {
                rej(e);
            }
        }, 2000);
    });
}



// TODO Add Express server version: https://www.npmjs.com/package/express



// If using Webpack
async function runWebpackServer() {
    type Configuration = import('webpack').Configuration;
    type WebpackFactory = typeof import('webpack').webpack;
    type WebpackDevServerClass = typeof import('webpack-dev-server');
    type WebpackDevServerConfig = import('webpack-dev-server').Configuration;
    type WebpackDevServerProxy = WebpackDevServerConfig['proxy'];
    type ProxyConfigEntry = import('webpack-dev-server').ProxyConfigArray;
    type ProxyConfigMap = import('webpack-dev-server').ProxyConfigMap;
    type ProxyConfigArray = ProxyConfigEntry[];

    const Webpack: WebpackFactory = (await import('webpack')).default;
    const WebpackDevServer: WebpackDevServerClass = (await import('webpack-dev-server')).default;
    const webpackConfig: Configuration = (await import(`${Paths.CONFIG.ABS}/webpack.config.mjs`)).default;

    const corsProxyUrl = new URL(proxyServerUrl!);

    function getCliProxyConfig(routes?: string[]): WebpackDevServerProxy {
        const baseConfig: Partial<WebpackDevServerProxy> = {
            target: proxyServerUrl,
            secure: false,
            changeOrigin: true,
            followRedirects: true,
            headers: {
                origin: corsProxyUrl.origin,
                referer: corsProxyUrl.origin,
                host: corsProxyUrl.host,
            },
        };

        if (routes?.length) {
            return routes.reduce((obj, route) => {
                obj[route] = baseConfig;

                return obj;
            }, {} as ProxyConfigMap) as WebpackDevServerProxy;
        }

        return [
            {
                ...baseConfig,
                context: proxyApis,
            },
        ] as unknown as WebpackDevServerProxy;
    }

    const devServerOptions: WebpackDevServerConfig = {
        ...webpackConfig.devServer,
        host: domain,
        server: {
            type: protocol,
            options: isHttps ? httpsOptions : undefined,
        },
        open: openBrowserOnBoot,
        proxy: !webpackConfig?.devServer?.proxy
            ? getCliProxyConfig()
            : Array.isArray(webpackConfig.devServer.proxy)
                ? [
                    ...webpackConfig.devServer.proxy,
                    ...(getCliProxyConfig() as ProxyConfigArray),
                ] as WebpackDevServerProxy
                : {
                    ...webpackConfig.devServer.proxy,
                    ...getCliProxyConfig(proxyApis),
                } as WebpackDevServerProxy,
    };

    webpackConfig.devServer = devServerOptions;

    const webpackCompiler = Webpack(webpackConfig as Configuration);
    const server = new WebpackDevServer(devServerOptions, webpackCompiler);

    console.log(`Starting server at "${hostname}"`);

    await server.start();
}



// If using NextJS
// Example: https://medium.com/bb-tutorials-and-thoughts/next-js-how-to-proxy-to-backend-server-987174737331
async function runNextJsServer() {
    const { parse } = await import('url');
    // @ts-ignore - Unrecognized import b/c this boilerplate isn't based on NextJS
    // eslint-disable-next-line import/no-unresolved
    const createNextServer = (await import('next')).default;
    // @ts-ignore - Same unrecognized import except for your custom NextJS config file
    // eslint-disable-next-line import/no-unresolved
    const NextConfig = (await import(`${Paths.ROOT.ABS}/next.config.js`)).default;

    /**
     * Custom function for proxying certain URL paths, query parameters, etc.
     * to another location.
     *
     * After headers and [redirections]{@link https://nextjs.org/docs/api-reference/next.config.js/redirects}
     * are applied, NextJS rewrites URL requests in the following order:
     *
     * 1. `beforeFiles` - Rewrites before any pages defined in the source code here are used.
     * 2. Serve static files from `public/`, `_next/static`, and non-dynamic pages (i.e. `src/pages/`).
     * 3. `afterFiles` - Rewrites after static files but before dynamic routes (i.e. routes defined via `<Router/>`, e.g. `src/pages/post/[postId].tsx`).
     * 4. `fallback` - Rewrites after all the above have failed (e.g. API calls).
     *
     * We choose `fallback` so that any other routes that might possibly have the same name are chosen
     * before proxying them to the server.
     *
     * Note: This means we must implement a CORS proxy ourselves to overwrite the related headers since they
     * would've already been set by NextJS (see server logic below).
     *
     * @type {NextConfig.rewrites}
     * @see [NextJS URL rewrites]{@link https://nextjs.org/docs/api-reference/next.config.js/rewrites}
     */
    async function getNextJsApiProxyConfig() {
        /** @type {import('next/dist/lib/load-custom-routes').Rewrite[]} */
        const proxyApiRewrites = proxyApis?.map(route => ({
            source: route,
            destination: `${proxyServerUrl}${route}`,
        }));

        return {
            fallback: proxyApiRewrites,
        };
    }

    if (proxyApis?.length) {
        NextConfig.rewrites = getNextJsApiProxyConfig;
    }

    if (mock) {
        (process.env as Record<string, unknown>).MOCK = true;
        NextConfig.env.MOCK = true;

        (process.env as Record<string, unknown>).MOCK_URLS = mock;
        NextConfig.env.MOCK_URLS = mock;
    }

    const nextJsServer = createNextServer({
        conf: NextConfig,
        dev,
        dir: Paths.ROOT.ABS,
        // Hostname (actually domain, excludes protocol) and port must be specified in order to use middleware. See: https://nextjs.org/docs/advanced-features/custom-server
        hostname: domain,
        port: port,
        customServer: true, // see: https://github.com/vercel/next.js/blob/3667eba385/packages/next/server/lib/start-server.ts#L47
        isNextDevCommand: false, // see: https://github.com/vercel/next.js/blob/3667eba385/packages/next/cli/next-dev.ts#L96
    });

    await nextJsServer.prepare();

    const appRequestHandler = nextJsServer.getRequestHandler();

    const server = createServer((request, res) => {
        const req = request as Required<IncomingMessage>;

        // URL is pathname + query string
        const { url } = req;
        // NextJS uses the deprecated `url.parse`, so we can't use `new URL(url, hostname)`
        const parsedUrl = parse(url, true);

        modifyRequestWithCorsProxy(req);

        // Let NextJS handle the request/response based on its own internal routing logic.
        appRequestHandler(req, res, parsedUrl);
    });

    return await new Promise<void>((res, rej) => {
        try {
            server.listen(port, domain, () => {
                console.log(`Dev server ready! Running at: ${hostname}`);

                if (openBrowserOnBoot) {
                    openWithDefaultApp(hostname);
                }

                res();
            });
        } catch (error) {
            rej(error);
        }
    });
}



(async (verifyServerStarted = false) => {
    await setCreateServerFunctionFromProtocol();

    await runVanillaNodeServer();
    // await runWebpackServer();
    // await runNextJsServer();

    if (verifyServerStarted) {
        await verifyServerIsRunning();
    }
})();
