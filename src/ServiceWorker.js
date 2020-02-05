var CACHE_NAME = 'cache-v1.0.0';
var urlsToCache = []; // filenames change in each build (via appended filename hashes), so they can't be predicted here

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

self.addEventListener('install', function(event) {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
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
                var isIndexHtml = url[url.length-1] === '/' || url.split('/').pop() === 'index.html';

                if (response) { // Cache hit - return response served from ServiceWorker
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
                        fetchAndCache(event, cache);
                    }

                    return response;
                } else { // Not cached - fetch it and then store for future network requests
                    return fetchAndCache(event, cache);
                }
            });
        })
    );
});
