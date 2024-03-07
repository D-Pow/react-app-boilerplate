var CACHE_NAME="cache-0.1.0",urlsToCache=["./static/assets/fonts/BrushScript.eot","./static/assets/fonts/BrushScript.woff","./static/assets/fonts/BrushScript.ttf","./apple-touch-icon.png","./favicon-144.png","./favicon-192.png","./favicon.ico","./favicon.png","./static/assets/react_logo.16ea806a.svg","./package.json","./manifest.json","./index.html","./static/js/client.2b03dd3d.bundle.js","./static/js/common.c2e74114.bundle.js","./static/js/runtime.142e4158.bundle.js","./static/js/Home.caecba9d.chunk.js","./static/js/About.8ad61068.chunk.js","./static/js/AnimeSearch.5908d8f9.chunk.js","./static/js/320.c1c00805.chunk.js","./static/js/410.66859584.chunk.js","./static/js/521.f39bca20.chunk.js","./static/js/986.52c63952.chunk.js","./static/js/957.2cb22421.chunk.js","./static/js/835.2c157e71.chunk.js","./static/js/920.eeb0ac4f.chunk.js","./static/js/403.cfca6c62.chunk.js","./static/js/31.2d051ff9.chunk.js","./static/css/styles.c8c1585b.css","./static/js/148.19dc1dca.chunk.js","./static/js/vendor-49d0a293.985f469a.bundle.js","./static/js/vendor-3062047c.ea36837d.bundle.js","./static/js/vendor-3572547a.84474346.bundle.js","./static/js/vendor-27545368.4deaa67c.bundle.js","./static/js/vendor-f82e0cd2.6c61c1e3.bundle.js","./"],urlsNotToCache=[],BROADCAST_CHANNEL="react-app-boilerplate",UPDATE_BROADCAST="UPDATE";function urlWithOptionalTrailingSlashesMatches(e,t){return e.match(new RegExp(`${t}/*$`,"i"))}function removeOldCaches(){return caches.keys().then((function(e){return Promise.all(e.filter((function(e){return e!==CACHE_NAME})).map((function(e){return console.log("Outdated cache",e,"will be removed"),caches.delete(e)})))}))}function clearCache(e,{onlyUrls:t=[],exceptUrls:n=[]}={}){function r(e){return e.keys().then((function(r){return Promise.all(r.filter((function(e){return!n.find((t=>urlWithOptionalTrailingSlashesMatches(t,e.url)))&&(t.length?t.find((t=>urlWithOptionalTrailingSlashesMatches(t,e.url))):e)})).map((function(t){return e.delete(t)})))}))}return t="string"==typeof t?[t]:null==t?[]:t,n="string"==typeof n?[n]:null==n?[]:n,null==e?caches.open(CACHE_NAME).then(r):r(e)}function fetchAndCache(e,t){return fetch(e.request).then((function(n){return t.put(e.request,n.clone()).catch((function(t){console.log("Could not cache url:",e.request.url,"Failed with error:",t)})),n})).catch((function(t){console.log("Could not fetch url:",e.request.url,"Failed with fetch error:",t)}))}function postMessageToClient(e){try{new BroadcastChannel(BROADCAST_CHANNEL).postMessage(e)}catch(e){}}self.addEventListener("install",(function(e){e.waitUntil(caches.open(CACHE_NAME).then((function(e){return console.log("Opened cache"),e.addAll(urlsToCache)})).then(removeOldCaches).then((function(){return self.skipWaiting()})))})),self.addEventListener("activate",(function(e){e.waitUntil(removeOldCaches()),e.waitUntil(self.clients.claim())})),self.addEventListener("fetch",(e=>{e.respondWith(caches.open(CACHE_NAME).then((function(t){return t.match(e.request).then((function(n){var r=e.request.url,c=r.split("/").pop(),l=String(n&&n.headers.get("content-type")||""),o=Boolean(l&&l.match(/(text|application)\/html/i)),i=("/"===r[r.length-1]||"index.html"===c||new URL(location.href).origin===r||o)&&new URL(r).pathname.split("/").length<=2,a=Boolean(c.match(/\.\w{2,6}$/))&&"GET"===e.request.method,u=urlsNotToCache.some((function(e){return e===r||e&&e.test&&e.test(r)}));if(n){if(i){var s=fetchAndCache(e,t),h=s.then((function(e){return e.clone().text()})),f=n.clone().text();Promise.all([h,f]).then((function(n){n[0]!==n[1]&&setTimeout((()=>{clearCache(t,{exceptUrls:r}).then((function(){return s.then((function(n){return t.put(e.request,n.clone()).catch((function(t){console.log("Could not cache url:",e.request.url,"Failed with error:",t)}))}))})).then((function(){postMessageToClient(UPDATE_BROADCAST),console.log("New website version is available, deleting old cache content")}))}),5e3)}))}return n}return u||!a&&!i?fetch(e.request):fetchAndCache(e,t)}))})))}));