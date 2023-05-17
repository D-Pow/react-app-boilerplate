var CACHE_NAME="cache-0.1.0",urlsToCache=["./apple-touch-icon.png","./favicon-144.png","./favicon-192.png","./favicon.ico","./favicon.png","./static/assets/react_logo.16ea806a.svg","./package.json","./manifest.json","./index.html","./static/js/client.6deb42af.bundle.js","./static/js/common.8ae4aa17.bundle.js","./static/js/runtime.a815a004.bundle.js","./static/js/Home.48fbc888.chunk.js","./static/js/About.8ad61068.chunk.js","./static/js/AnimeSearch.827c466e.chunk.js","./static/js/320.78744879.chunk.js","./static/js/410.66859584.chunk.js","./static/js/521.f39bca20.chunk.js","./static/js/986.52c63952.chunk.js","./static/js/957.2cb22421.chunk.js","./static/js/835.2c157e71.chunk.js","./static/js/920.eeb0ac4f.chunk.js","./static/js/403.cfca6c62.chunk.js","./static/js/31.2d051ff9.chunk.js","./static/css/styles.f945dd4c.css","./static/js/vendor-49d0a293.0d2954b4.bundle.js","./static/js/vendor-777dc6a6.930beac9.bundle.js","./static/js/vendor-485f66e7.23232d6f.bundle.js","./static/js/vendor-3d52e142.64c83604.bundle.js","./static/js/vendor-3572547a.84474346.bundle.js","./static/js/vendor-27545368.46cc6af0.bundle.js","./static/js/vendor-f82e0cd2.6c61c1e3.bundle.js","./"],urlsNotToCache=[],BROADCAST_CHANNEL="react-app-boilerplate",UPDATE_BROADCAST="UPDATE";function removeOldCaches(){return caches.keys().then((function(e){return Promise.all(e.filter((function(e){return e!==CACHE_NAME})).map((function(e){return console.log("Outdated cache",e,"will be removed"),caches.delete(e)})))}))}function clearCache(e,t){function n(e){return e.keys().then((function(n){return Promise.all(n.filter((function(e){return t.length?t.includes(e.url):e})).map((function(t){return e.delete(t)})))}))}return"string"==typeof t?t=[t]:null==t&&(t=[]),null==e?caches.open(CACHE_NAME).then(n):n(e)}function fetchAndCache(e,t){return fetch(e.request).then((function(n){return t.put(e.request,n.clone()).catch((function(t){console.log("Could not cache url:",e.request.url,"Failed with error:",t)})),n})).catch((function(t){console.log("Could not fetch url:",e.request.url,"Failed with fetch error:",t)}))}function postMessageToClient(e){try{new BroadcastChannel(BROADCAST_CHANNEL).postMessage(e)}catch(e){}}self.addEventListener("install",(function(e){e.waitUntil(caches.open(CACHE_NAME).then((function(e){return console.log("Opened cache"),e.addAll(urlsToCache)})).then(removeOldCaches).then((function(){return self.skipWaiting()})))})),self.addEventListener("activate",(function(e){e.waitUntil(removeOldCaches())})),self.addEventListener("fetch",(e=>{e.respondWith(caches.open(CACHE_NAME).then((function(t){return t.match(e.request).then((function(n){var c=e.request.url,o=c.split("/").pop(),r=String(n&&n.headers.get("content-type")||""),l=Boolean(r&&r.match(/(text|application)\/html/i)),u=("/"===c[c.length-1]||"index.html"===o||new URL(location.href).origin===c||l)&&new URL(c).pathname.split("/").length<=2,i=Boolean(o.match(/\.\w{2,6}$/))&&"GET"===e.request.method,a=urlsNotToCache.some((function(e){return e===c||e&&e.test&&e.test(c)}));if(n){if(u){var h=fetchAndCache(e,t),s=h.then((function(e){return e.clone().text()})),f=n.clone().text();Promise.all([s,f]).then((function(n){n[0]!==n[1]&&setTimeout((()=>{clearCache(t,c).then((function(){return h.then((function(n){return t.put(e.request,n.clone()).catch((function(t){console.log("Could not cache url:",e.request.url,"Failed with error:",t)}))}))})).then((function(){postMessageToClient(UPDATE_BROADCAST),console.log("New website version is available, deleting old cache content")}))}),5e3)}))}return n}return a||!i&&!u?fetch(e.request):fetchAndCache(e,t)}))})))}));