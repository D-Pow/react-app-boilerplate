#!/usr/bin/env -S npx ts-node
// #!/usr/bin/env -S node --loader ts-node/esm --experimental-top-level-await
/* globals NodeJS */

import {
    createServer as createHttpServer,
    get as httpGet,
    type ClientRequest,
    type IncomingMessage,
} from 'http';
import {
    createServer as createHttpsServer,
    get as httpsGet,
} from 'https';

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



/**
 * Configures options for the dev-server.
 */
function configureServer({
    /**
     * Array of option flags and/or arguments.
     */
    argv,
}: Partial<{
    argv: string[];
}> = {}) {
    const parsedArgs = parseCliArgs({
        argv,
        helpMessage: 'Runs a dev-server with QoL customizations, including proxying API calls to Prod vs local back-end server, opening the browser on dev-server boot, etc.',
        optionsConfigs: {
            openBrowserOnBoot: {
                description: 'If the browser should be opened when the dev-server boots.',
                aliases: [ 'o', 'open' ],
                defaultValue: true,
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

    return serverConfigs;
}

const {
    openBrowserOnBoot,
    certLifetime,
    certRefresh,
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
        httpsOptions = await getServerHttpsCredentials(
            {
                validityDays: certLifetime,
            },
            {
                force: certRefresh,
            },
        );

        createServer = createHttpsServer.bind(null, httpsOptions);
        get = httpsGet;
    }
}



// If using vanilla `http(s)` server
async function runVanillaNodeServer() {
    try {
        const server = createServer((req, res) => {
            // URL is pathname + query string
            const { url } = req;

            // Parse the URL relative to the user-defined protocol+domain+port
            const parsedUrl = new URL(url!, hostname);

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
    const verifyServerClientRequest: ClientRequest = get(hostname, (res: IncomingMessage) => {
        const { statusCode = 400 } = res;
        const contentType = res.headers['content-type'] || 'text/plain';

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
            res.resume();

            return;
        }

        res.setEncoding('utf-8');

        let rawData = '';

        res.on('data', (chunk) => {
            rawData += chunk;
        });

        res.on('end', () => {
            try {
                const parsedData = JSON.parse(rawData);
                console.log('Yay it worked!', parsedData);
            } catch (couldntParseJsonError) {
                const endErrorObj = couldntParseJsonError as unknown as Error;
                console.error(endErrorObj.message);
                console.log(`Received: ${rawData}`);
            }
        });
    });

    verifyServerClientRequest.on('error', (error) => {
        console.error(`Got error: ${error.message}`);
    });
}



// If using Webpack
async function runWebpackServer() {
    const Webpack = (await import('webpack')).default;
    const WebpackDevServer = (await import('webpack-dev-server')).default;
    const webpackConfig = (await import(`${Paths.CONFIG.ABS}/webpack.config.mjs`)).default;

    type Configuration = import('webpack').Configuration;

    const webpackCompiler = Webpack(webpackConfig as Configuration);
    const devServerOptions = {
        ...webpackConfig.devServer,
        https: httpsOptions,
    };

    const server = new WebpackDevServer(devServerOptions, webpackCompiler);

    console.log(`Starting server at "${hostname}"`);

    await server.start();
}



// If using NextJS
async function runNextJsServer() {
    const { parse } = await import('url');
    // @ts-ignore - Unrecognized import b/c this boilerplate isn't based on NextJS
    // eslint-disable-next-line import/no-unresolved
    const createNextServer = (await import('next')).default;
    // @ts-ignore - Same unrecognized import except for your custom NextJS config file
    // eslint-disable-next-line import/no-unresolved
    const NextConfig = (await import(`${Paths.ROOT.ABS}/next.config.js`)).default;

    const nextJsServer = createNextServer({
        conf: NextConfig,
        dev,
        dir: Paths.ROOT.ABS,
        customServer: true, // see: https://github.com/vercel/next.js/blob/3667eba385/packages/next/server/lib/start-server.ts#L47
        isNextDevCommand: false, // see: https://github.com/vercel/next.js/blob/3667eba385/packages/next/cli/next-dev.ts#L96
    });

    await nextJsServer.prepare();

    const appRequestHandler = nextJsServer.getRequestHandler();

    const server = createServer((req, res) => {
        // URL is pathname + query string
        const { url } = req;

        // NextJS uses the deprecated `url.parse`, so we can't use `new URL(url, hostname)`
        const parsedUrl = parse(url!, true);

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
