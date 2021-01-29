var CACHE_NAME = 'cache-VERSION';
var urlsToCache = []; // filenames change in each build (via appended filename hashes) and are injected during webpack build
var BROADCAST_CHANNEL = 'BRD_CHANNEL';
var UPDATE_BROADCAST = 'UPDATE';

function removeOldCaches() {
    return caches.keys()
        .then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    return cacheName !== CACHE_NAME;
                }).map(function(cacheName) {
                    console.log('Outdated cache', cacheName, 'will be removed');
                    return caches.delete(cacheName);
                })
            );
        });
}

function clearCache(cache, exceptUrls) {
    if (typeof exceptUrls === typeof '') {
        exceptUrls = [ exceptUrls ];
    } else if (exceptUrls == null) {
        exceptUrls = [];
    }

    function clearCacheEntries(cacheObj) {
        return cacheObj.keys().then(function(requests) {
            return Promise.all(
                requests.filter(function(request) {
                    return !exceptUrls.includes(request.url);
                }).map(function(request) {
                    return cacheObj.delete(request);
                })
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
    } catch(e) {
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
            })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        removeOldCaches()
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.match(event.request).then(function(response) {
                var url = event.request.url;
                var fileRequested = url.split('/').pop();
                var isIndexHtml = url[url.length-1] === '/' || fileRequested === 'index.html';
                var isResourceFile = Boolean(fileRequested.match(/\.\w{2,6}$/)) && event.request.method === 'GET';

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
                            return res.text();
                        });
                        var oldIndexHtmlBody = response.clone().text();

                        Promise.all([ newIndexHtmlBody, oldIndexHtmlBody ])
                            .then(function(htmlStrings) {
                                var newIndexHtmlText = htmlStrings[0];
                                var oldIndexHtmlText = htmlStrings[1];

                                if (newIndexHtmlText !== oldIndexHtmlText) {
                                    setTimeout(function() {
                                        /* Service worker will determine if index.html changed
                                         * before the page actually loads, so add a timeout to
                                         * message broadcast to allow the website to continue loading
                                         * before receiving the message.
                                         */
                                        postMessageToClient(UPDATE_BROADCAST);
                                        clearCache(cache, url);
                                        console.log('New website version is available, deleting old cache content');
                                    }, 5000);
                                }
                            });
                    }

                    return response;
                } else if (isResourceFile || isIndexHtml) {
                    // Not cached - fetch it and then store for future network requests
                    return fetchAndCache(event, cache);
                }

                // Not a resource file (e.g. is an endpoint request) - do not cache it so it's fresh on every request
                return fetch(event.request);
            });
        })
    );
});
