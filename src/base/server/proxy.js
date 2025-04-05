import net from "node:net";
import {EventEmitter} from "node:events";
import WebSocket, {WebSocketServer} from 'ws';
import {R} from './../../utils/base.js';
import * as crypto from "node:crypto";

const utils = {
    getRandomPort() {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.unref();
            server.on('error', reject);
            server.listen(0, () => {
                const port = server.address().port;
                server.close(() => {
                    resolve(port);
                });
            });
        });
    },
    httpToWebsocketURL(url) {
        if (url.startsWith("http://")) {
            return url.replace(/^http:\/\//, "ws://");
        } else if (url.startsWith("https://")) {
            return url.replace(/^https:\/\//, "wss://");
        }
        return url;
    },
    md5(str) {
        return crypto.createHash('md5').update(str).digest('hex');
    }
}

export class ProxyServer extends EventEmitter {
    constructor({id, port, wsUrl, token, linkHost, linkPort, linkEdgeId} = {}) {
        super();
        this.id = id;
        this.port = port;
        this.wsUrl = wsUrl;
        this.headers = {
            'x-tunnel-type': 'lnk',
            'x-tunnel-token': token,
            'x-tunnel-link-edge': linkEdgeId,
            'x-tunnel-link-host': linkHost,
            'x-tunnel-link-port': linkPort,
        };
        this.server = null;
    }

    getInfo() {
        let {
            'x-tunnel-link-edge': edgeId,
            'x-tunnel-link-host': host,
            'x-tunnel-link-port': port,
        } = this.headers;
        return {
            id: this.id,
            edgeId,
            host,
            port
        };
    }

    async start() {
        const tcpServer = this.server = net.createServer((tcpSocket) => {
            console.log('TCP client connected');
            const ws = new WebSocket(this.wsUrl, {binaryType: 'arraybuffer', headers: this.headers});
            ws.on('open', () => {
                console.log('WebSocket connection established');
                tcpSocket.on('data', (data) => {
                    ws.send(data, {binary: true});
                });
            });
            ws.on('message', (message) => {
                if (message instanceof Buffer) {
                    tcpSocket.write(message);
                } else if (message instanceof ArrayBuffer) {
                    tcpSocket.write(Buffer.from(message));
                } else {
                    console.error('Unsupported message type:', typeof message);
                }
            });
            ws.on('close', () => {
                console.log('WebSocket connection closed');
                tcpSocket.end();
            });
            ws.on('error', (err) => {
                console.error('WebSocket error:', err);
                tcpSocket.end();
            });
            tcpSocket.on('close', () => {
                console.log('TCP client disconnected');
                ws.close();
            });
            tcpSocket.on('error', (err) => {
                console.error('TCP socket error:', err);
                ws.close();
            });
        });
        tcpServer.on('close', () => {
            console.log(`TCP server stopped`);
            this.emit("stopped");
        });
        return new Promise((resolve, reject) => {
            tcpServer.listen(this.port, () => {
                resolve();
                this.emit("started");
                console.log(`TCP server listening on port ${this.port}`);
            });
        });
    }

    stop() {
        return new Promise((resolve, reject) => {
            this.server.close((err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

export class ProxyServerManager extends EventEmitter {
    constructor() {
        super();
        this.serviceProxyServers = new Map();
    }

    async startServiceProxyServer({wsUrl, port, token, linkHost, linkPort, linkEdgeId}) {
        let id = utils.md5(`${linkEdgeId}-${linkHost}-${linkPort}`);
        console.log('Start proxy service:', id, linkEdgeId, linkHost, linkPort, port);
        if (!this.serviceProxyServers.has(id)) {
            port = port ? port : await utils.getRandomPort();
            let ws = utils.httpToWebsocketURL(wsUrl);
            let proxy = new ProxyServer({
                id, wsUrl: ws + "/gateway", port,
                token, linkHost,
                linkPort, linkEdgeId,
            });
            proxy.on("stopped", () => {
                console.log('Stop proxy service:', id);
                this.emit("serviceTunnelStopped", {id});
                this.serviceProxyServers.delete(id);
            });
            await proxy.start();
            this.serviceProxyServers.set(id, proxy);
            this.emit("serviceTunnelStarted", {id});
        }
    }

    async stopServiceProxyServer(id) {
        if (this.serviceProxyServers.has(id)) {
            await this.serviceProxyServers.get(id).stop();
        }
    }

    getList() {
        return Array.from(this.serviceProxyServers.values()).map(a => a.getInfo());
    }
}

const controller = {
    async startProxy(params) {
        await Proxy.serverManager.startServiceProxyServer(params);
        return R.ok(true);
    },
    async stopProxy({id}) {
        await Proxy.serverManager.stopServiceProxyServer(id);
        return R.ok(true);
    },
    async getProxies() {
        return R.ok(Proxy.serverManager.getList());
    }
};

const Proxy = {
    server: null,
    serverManager: new ProxyServerManager(),
    getParams() {
        const args = process.argv.slice(2);
        const params = {};
        for (let i = 0; i < args.length; i += 2) {
            const key = args[i].replace(/^--/, '');
            const value = args[i + 1];
            params[key] = value;
        }
        return params;
    },
    async start() {
        let {port} = this.getParams();
        const wss = new WebSocketServer({port});
        wss.on('connection', (ws) => {
            ws.on('error', console.error);
            ws.on('message', (data) => {
                console.log('received: %s', data);
                let {id, type, params} = JSON.parse(data);
                Promise.resolve().then(() => controller[type](params)).then(r => {
                    ws.send(JSON.stringify({id, ...r}));
                });
            });
            ws.on('close', () => {
                console.log('disconnected');
            });
            ws.send(JSON.stringify({type: 'ready'}));
        });
    }
}

Proxy.start();