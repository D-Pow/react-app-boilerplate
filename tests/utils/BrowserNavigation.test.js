import {
    getQueryParams,
    pushQueryParamOnHistory,
    getUrlSegments,
    isIpAddress,
} from '@/utils/BrowserNavigation';

import { mockObjProperty } from '/tests';

describe('BrowserNavigation', () => {
    function getFullUrlFromSegments(segmentedUrlObj) {
        return (
            segmentedUrlObj.origin
            + segmentedUrlObj.pathname
            + segmentedUrlObj.queryParamHashString
        );
    }

    const Urls = {
        ipPortPath: {
            get fullUrl() {
                return getFullUrlFromSegments(this);
            },
            protocol: 'http',
            domain: '192.168.0.1',
            port: '3000',
            origin: 'http://192.168.0.1:3000',
            pathname: '/static/assets',
            queryParamHashString: '',
            queryParamMap: {},
            hash: '',
        },
        ipPortPathQuery: {
            get fullUrl() {
                return getFullUrlFromSegments(this);
            },
            protocol: 'http',
            domain: '192.168.0.23',
            port: '3000',
            origin: 'http://192.168.0.23:3000',
            pathname: '',
            queryParamHashString: '?a=A&b=B',
            queryParamMap: { a: 'A', b: 'B' },
            hash: '',
        },
        ipPortPathQueryHash: {
            get fullUrl() {
                return getFullUrlFromSegments(this);
            },
            protocol: 'https',
            domain: '192.168.0.23',
            port: '3000',
            origin: 'https://192.168.0.23:3000',
            pathname: '',
            queryParamHashString: '?a=A&b=B#/home',
            queryParamMap: { a: 'A', b: 'B', '#': '/home' },
            hash: '/home',
        },
        multivalueEncodedQueryParamsHash: {
            get fullUrl() {
                return getFullUrlFromSegments(this);
            },
            protocol: 'https',
            domain: 'localhost.com',
            port: '',
            origin: 'https://localhost.com',
            pathname: '/some/path',
            queryParamHashString: (
                ''
                + '?' + 'a=A'
                + '&' + 'b=Cc%3DDd'
                + '&' + 'b=hello%20world'
                + '&' + 'f=g%3Dh'
                + '&' + 'h=!%40%20%24%25%5E*()_%3Dasdf'
                + '#' + 'myHash'
            ),
            queryParamMap: { a: 'A', b: [ 'Cc=Dd', 'hello world' ], f: 'g=h', h: '!@ $%^*()_=asdf', '#': 'myHash' },
            hash: 'myHash',
        },
        noneButHash: {
            get fullUrl() {
                return getFullUrlFromSegments(this);
            },
            protocol: 'https',
            domain: 'localhost.com',
            port: '',
            origin: 'https://localhost.com',
            pathname: '',
            queryParamHashString: '#myHash',
            queryParamMap: { '#': 'myHash' },
            hash: 'myHash',
        },
    };

    describe('getQueryParams', () => {
        Object.entries(Urls).forEach(([ urlType, urlSegmentsObj ]) => {
            it(`should create query string and decoded query params object for "${urlType}"`, () => {
                const { fullUrl, queryParamHashString, queryParamMap } = urlSegmentsObj;

                // expect(getQueryParams(fullUrl)).toEqual(queryParamMap);
                expect(getQueryParams(queryParamHashString)).toEqual(queryParamMap);
                expect(getQueryParams(queryParamHashString.replace(/^\?/, ''))).toEqual(queryParamMap);
                expect(getQueryParams(queryParamMap)).toEqual(queryParamHashString);
            });
        });

        it('should default to parsing `location.(search|hash)` with no args', () => {
            const locationObj = Urls.multivalueEncodedQueryParamsHash;
            const href = locationObj.fullUrl;
            const search = locationObj.queryParamHashString.replace(/#.*/, '');
            const hash = `#${locationObj.hash}`;

            mockObjProperty(window, 'location', {
                value: {
                    href,
                    search,
                    hash,
                },
            });

            expect(getQueryParams()).toEqual(locationObj.queryParamMap);
        });
    });

    describe('getUrlSegments', () => {
        Object.entries(Urls).forEach(([ urlType, urlSegmentsObj ]) => {
            it(`should get all segments for "${urlType}" even if some are missing`, () => {
                expect(getUrlSegments(urlSegmentsObj.fullUrl)).toEqual(urlSegmentsObj);
            });
        });
    });

    describe('isIpAddress', () => {
        const localhostDomains = [
            'https://localhost',
            'https://localhost.com',
            'https://localhost/some/path',
            'https://localhost.com/some/path',
        ];

        const nonLocalhostDomains = [
            'https://codepen.io',
            'https://example.com/some/path',
        ];

        const localhostIps = [
            '127.0.0.1',
            '192.168.0.23',
            '192.168.0.255',
            '10.162.11.209',
            '10.162.11.209',
            '172.16.0.0',
            '172.31.255.255',
        ];

        const nonLocalhostIps = [
            '172.15.255.255',
            '172.32.0.0',
        ];

        it('should determine if a domain is an IP address or not', () => {
            [ localhostIps, nonLocalhostIps ].forEach(ipList => {
                ipList.forEach(ipAddress => {
                    expect(isIpAddress(ipAddress, { includeLocalhostDomain: true })).toBe(true);
                    expect(isIpAddress(ipAddress, { includeLocalhostDomain: false })).toBe(true);
                });
            });

            [ localhostDomains, nonLocalhostDomains ].forEach(domainList => {
                domainList.forEach(domain => {
                    expect(isIpAddress(domain, { includeLocalhostDomain: true })).toBe(false);
                    expect(isIpAddress(domain, { includeLocalhostDomain: false })).toBe(false);
                });
            });
        });

        it('should determine if an IP address is localhost or not', () => {
            localhostIps.forEach(ipAddress => {
                expect(isIpAddress(ipAddress)).toBe(true);
                expect(isIpAddress(ipAddress, { onlyLocalhost: true })).toBe(true);
            });

            nonLocalhostIps.forEach(ipAddress => {
                expect(isIpAddress(ipAddress)).toBe(true);
                expect(isIpAddress(ipAddress, { onlyLocalhost: true })).toBe(false);
            });
        });

        it('should determine if a domain is localhost or not', () => {
            localhostDomains.forEach(domain => {
                expect(isIpAddress(domain, { onlyLocalhost: true, includeLocalhostDomain: true })).toBe(true);
                expect(isIpAddress(domain, { onlyLocalhost: true, includeLocalhostDomain: false })).toBe(false);
            });

            nonLocalhostDomains.forEach(domain => {
                expect(isIpAddress(domain, { onlyLocalhost: true, includeLocalhostDomain: true })).toBe(false);
                expect(isIpAddress(domain, { onlyLocalhost: true, includeLocalhostDomain: false })).toBe(false);
            });
        });
    });
});
