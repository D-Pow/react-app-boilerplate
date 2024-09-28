var CACHE_NAME = 'cache-VERSION';
var urlsToCache = []; // filenames change in each build (via appended filename hashes) and are injected during webpack build
var urlsNotToCache = [];
var BROADCAST_CHANNEL = 'BRD_CHANNEL';
var UPDATE_BROADCAST = 'UPDATE';


function urlWithOptionalTrailingSlashesMatches(urlToCheck, urlToMatch) {
    return urlToCheck.match(new RegExp(`${urlToMatch}/*$`, 'i'));
}

function removeOldCaches() {
    return caches.keys()
        .then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    return cacheName !== CACHE_NAME;
                }).map(function(cacheName) {
                    console.log('Outdated cache', cacheName, 'will be removed');
                    return caches.delete(cacheName);
                }),
            );
        });
}

function clearCache(cache, {
    onlyUrls = [],
    exceptUrls = [],
} = {}) {
    onlyUrls = typeof onlyUrls === typeof ''
        ? [ onlyUrls ]
        : onlyUrls == null
            ? []
            : onlyUrls;
    exceptUrls = typeof exceptUrls === typeof ''
        ? [ exceptUrls ]
        : exceptUrls == null
            ? []
            : exceptUrls;

    function clearCacheEntries(cacheObj) {
        return cacheObj.keys().then(function(requests) {
            return Promise.all(
                requests.filter(function(request) {
                    if (exceptUrls.find(url => urlWithOptionalTrailingSlashesMatches(url, request.url))) {
                        return false;
                    }

                    if (onlyUrls.length) {
                        return onlyUrls.find(url => urlWithOptionalTrailingSlashesMatches(url, request.url));
                    }

                    return request;
                }).map(function(request) {
                    return cacheObj.delete(request);
                }),
            );
        });
    }

    if (cache == null) {
        return caches.open(CACHE_NAME).then(clearCacheEntries);
    }

    return clearCacheEntries(cache);
}

function fetchAndCache(event, cache) {
    return fetch(event.request)
        .then(function(fetchResponse) {
            cache.put(event.request, fetchResponse.clone()).catch(function(cacheError) {
                console.log('Could not cache url:', event.request.url, 'Failed with error:', cacheError);
            });

            return fetchResponse;
        })
        .catch(function(fetchError) {
            console.log('Could not fetch url:', event.request.url, 'Failed with fetch error:', fetchError);
        });
}

function postMessageToClient(message) {
    try {
        var channel = new BroadcastChannel(BROADCAST_CHANNEL);

        channel.postMessage(message);
    } catch (e) {
        // BroadcastChannel not defined, likely because client is using Safari or IE
    }
}

self.addEventListener('install', function(event) {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .then(removeOldCaches)
            .then(function() {
                return self.skipWaiting(); // needed to force new service workers to overwrite old ones
            }),
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(removeOldCaches());
    // Activate service worker immediately rather than waiting for page reload.
    // See:
    //  - https://betterprogramming.pub/turning-your-existing-application-into-a-pwa-776d65b0aa12#2a44
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    event.respondWith(caches.open(CACHE_NAME)
        .then(function(cache) {
            return cache.match(event.request).then(function(response) {
                var url = event.request.url;
                var fileRequested = url.split('/').pop();
                var responseContentType = String(response && response.headers.get('content-type') || '');  // Cast to string, but prevent casting null/undefined to 'null'/'undefined' via ''
                var responseIsHtmlFile = Boolean(responseContentType && responseContentType.match(/(text|application)\/html/i));
                var isIndexHtml = (
                    (
                        url[url.length-1] === '/'
                        || fileRequested === 'index.html'
                        || (new URL(location.href).origin === url)
                        || responseIsHtmlFile
                    )
                    && (new URL(url)).pathname.split('/').length <= 2
                );
                var isResourceFile = Boolean(fileRequested.match(/\.\w{2,6}$/)) && event.request.method === 'GET';
                var shouldNotCache = urlsNotToCache.some(function (regexOrString) {
                    return (
                        regexOrString === url
                        || (
                            regexOrString
                            && regexOrString.test
                            && regexOrString.test(url)
                        )
                    );
                });

                if (response) {
                    // Cache hit - return response served from ServiceWorker
                    if (isIndexHtml) {
                        /**
                         * If a root level file (like index.html) is requested, then function in a cache-then-network
                         * fashion. This way, any updates to them will be shown on next page refresh while still
                         * allowing the old versions of the files to be viewed when offline.
                         *
                         * Note: Since all source files have a hash appended to their names, any update in index.html
                         * will reflect once the page is reloaded. Any change in this service worker will best be
                         * handled by unregistering old ones.
                         */
                        var newIndexHtmlResponse = fetchAndCache(event, cache);
                        var newIndexHtmlBody = newIndexHtmlResponse.then(function(res) {
                            return res.clone().text();
                        });
                        var oldIndexHtmlBody = response.clone().text();

                        Promise.all([ newIndexHtmlBody, oldIndexHtmlBody ])
                            .then(function(htmlStrings) {
                                var newIndexHtmlText = htmlStrings[0];
                                var oldIndexHtmlText = htmlStrings[1];

                                if (newIndexHtmlText !== oldIndexHtmlText) {
                                    /* Service worker will determine if index.html changed
                                     * before the page actually loads, so wait until promises resolve
                                     * before broadcasting to allow the website to continue loading
                                     * before receiving the message.
                                     *
                                     * Also, clear cache first, then add the new index.html content to the
                                     * new cache so that it's already cached for the next page reload.
                                     *
                                     * Run this in a timeout so the previous version of the website still
                                     * loads before the cache is cleared when the user visits the site.
                                     */
                                    setTimeout(() => {
                                        clearCache(cache, { exceptUrls: url })
                                            .then(function () {
                                                return newIndexHtmlResponse.then(function (newIndexHtmlResponseObject) {
                                                    return cache
                                                        .put(event.request, newIndexHtmlResponseObject.clone())
                                                        .catch(function (cacheError) {
                                                            console.log('Could not cache url:', event.request.url, 'Failed with error:', cacheError);
                                                        });
                                                });
                                            })
                                            .then(function () {
                                                postMessageToClient(UPDATE_BROADCAST);

                                                console.log('New website version is available, deleting old cache content');
                                            });
                                    }, 5000);
                                }
                            });
                    }

                    return response;
                }

                if (!shouldNotCache && (isResourceFile || isIndexHtml)) {
                    // Not cached - fetch it and then store for future network requests
                    return fetchAndCache(event, cache);
                }

                // Not a resource file (e.g. is an endpoint request) - do not cache it so it's fresh on every request
                return fetch(event.request);
            });
        }),
    );
});
