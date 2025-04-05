import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from "node:path";
import {workspaceManager} from "../workspace.js";
import fs from "node:fs";
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const callbacks = new Map();

export class DaemonClient {
    constructor(port) {
        this.port = port;
        this.client = null;
    }

    async start() {
        let port = this.port;
        return new Promise((resolve, reject) => {
            const ws = this.client = new WebSocket(`ws://localhost:${port}`);
            const timeout = setTimeout(() => {
                ws.close();
                reject('Connect timeout,daemon is not running');
            }, 5000);
            ws.on('open', () => {
                clearTimeout(timeout);
                console.log('Connected daemon process');
                ws.on('message', (message) => {
                    console.log('receive:', message.toString());
                    let {id, code, data, msg, type} = JSON.parse(message.toString());
                    if (type === 'ready') {
                        resolve(ws);
                    } else {
                        if (callbacks.has(id)) {
                            if (code === 0) {
                                callbacks.get(id).resolve({code, data, msg});
                            } else {
                                callbacks.get(id).reject({code, data, msg});
                            }
                        }
                    }
                });
                ws.on('close', () => {
                    console.log('WebSocket连接关闭');
                });
                ws.onerror = (error) => {
                    console.log('WebSocket通信错误:', error.message);
                };
            });
            ws.on('error', (error) => {
                clearTimeout(timeout);
                if (ws.readyState !== WebSocket.OPEN) {
                    reject(`try to start daemon process`);
                }
            });
            ws.on('close', (code, reason) => {
                clearTimeout(timeout);
                if (code !== 1000) {
                    reject(`try to start daemon process`);
                }
            });
        });
    }

    send(type, params = {}) {
        let id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        console.log('------ send id:', id);
        return new Promise((resolve, reject) => {
            this.client.send(JSON.stringify({id, type, params}));
            callbacks.set(id, {resolve, reject});
        });
    }
}

export const daemonManager = {
    async start(port) {
        let {log, error} = await daemonManager.getLogStream();
        const args = ['--port', port];
        const daemon = spawn('node', [path.resolve(__dirname, './proxy.js'), ...args], {
            detached: true,
            stdio: ['ipc', log, error, 'pipe'],
            windowsHide: true
        });
        daemon.unref();
        console.log('Started daemon process PID:', daemon.pid);
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(), 3000);
        })
    },
    async stop() {
    },
    async getClient() {
        let port = await workspaceManager.getDaemonPort();
        let client = new DaemonClient(port);
        return client.start().then(() => {
            return client;
        }).catch(e => {
            return this.start(port).then(() => this.getClient());
        });
    },
    async getLogStream() {
        let {log, error} = await workspaceManager.getLogPath();
        return {
            log: fs.openSync(log, 'a'),
            error: fs.openSync(error, 'a')
        }
    }
}