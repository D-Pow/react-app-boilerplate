export interface WsOptions {
    onOpen?: (e: Event) => void;
    onMessage?: (e: MessageEvent) => void;
    onError?: (e: Event) => void;
}

export default class Ws {
    ws: WebSocket;

    constructor(url: string, protocols: string | string[], {
        onOpen = () => {},
        onMessage = () => {},
        onError = () => {},
    }: WsOptions = {}) {
        this.ws = new WebSocket(url, protocols);

        this.ws.onopen = onOpen;

        this.ws.onmessage = (e) => {
            const event = e as unknown as MessageEvent & { _data: unknown; };

            Object.defineProperties(event, {
                _data: {
                    configurable: false,
                    enumerable: false,
                    writable: false,
                    value: e.data,
                },
                data: {
                    configurable: false,
                    enumerable: true,
                    get() {
                        try {
                            return JSON.parse(event._data as string);
                        } catch (err) {
                            return event._data;
                        }
                    },
                },
            });

            if (this.ws.readyState === 1) {
                onMessage(event);
            }
        };

        this.ws.onerror = (e) => {
            onError(e);
        };
    }

    send(data: Parameters<WebSocket['send']>[0]) {
        this.ws.send(data);
    }
}
