import Path from 'node:path';
import {isExist, readJSON, touch, writeJSON} from '../utils/fs.js';
import {getRandomPort} from "../utils/base.js";

const defaultWorkspace = {
    host: "",
    token: "",
    proxies: []
};
const defaultProxy = {
    name: "",
    edgeId: "",
    edgeToken: "",
    tcpHost: "",
    tcpPort: ""
};
const workDir = Path.resolve(process.env.HOME, './.synterix');
const workspacePath = Path.resolve(workDir, './workspaces.json');
const daemonLogPath = Path.resolve(workDir, './logs/log.log');
const daemonErrorPath = Path.resolve(workDir, './logs/error.log');

class WorkspaceManager {
    constructor() {
        this.workspaces = {
            current: 'default',
            daemonPort: null,
            list: [{name: 'default', ...defaultWorkspace}]
        };
    }

    async getLogPath() {
        await touch(daemonLogPath);
        await touch(daemonErrorPath);
        return {
            log: daemonLogPath,
            error: daemonErrorPath
        }
    }

    async getDaemonPort() {
        let {daemonPort} = await this.getAll();
        if (!daemonPort) {
            daemonPort = this.workspaces.daemonPort = await getRandomPort();
            await this.save();
        }
        return daemonPort;
    }

    async load() {
        let _isExist = await isExist(workspacePath);
        if (!_isExist) {
            await this.save();
        }
        let r = await readJSON(workspacePath);
        Object.assign(this.workspaces, r);
    }

    async save() {
        return writeJSON(workspacePath, this.workspaces);
    }

    async create(name) {
        this.workspaces.list.push({name, ...defaultWorkspace});
        await this.save();
    }

    async delete(name) {
        this.workspaces.list = this.workspaces.list.filter(a => a.name !== name);
        await this.save();
    }

    async toggle(name) {
        if (!name || name === 'default') {
            return false;
        }
        if (this.workspaces.list.find(a => a.name === name)) {
            this.workspaces.current = name;
            await this.save();
            return true;
        } else {
            return false;
        }
    }

    async get(name) {
        await this.load();
        if (!name) {
            return this.workspaces.list.find(a => a.name === this.workspaces.current);
        }
        return this.workspaces.list.find(a => a.name === name);
    }

    async getList() {
        await this.load();
        return this.workspaces.list;
    }

    async getAll() {
        await this.load();
        return this.workspaces;
    }

    async setHost(name, host) {
        await this.load();
        let t = this.workspaces.list.find(a => a.name === name);
        if (t) {
            t.host = host;
            await this.save();
        }
    }

    async setToken(name, token) {
        await this.load();
        let t = this.workspaces.list.find(a => a.name === name);
        if (t) {
            t.token = token;
            await this.save();
        }
    }

    async addProxy(proxy) {
        await this.load();
        let t = this.workspaces.list.find(a => a.name === this.workspaces.current).proxies;
        let m = t.find(a => a.name === proxy.name);
        if (m) {
            Object.assign(m, proxy);
        } else {
            this.workspaces.list.find(a => a.name === this.workspaces.current).proxies.push(proxy);
        }
        await this.save();
    }

    async removeProxy(proxy) {
        await this.load();
        let t = this.workspaces.list.find(a => a.name === this.workspaces.current).proxies;
        let index = t.findIndex(a => a.name === proxy.name);
        if (index !== -1) {
            t.splice(index, 1);
            await this.save();
        }
    }

    async setProxy(proxy) {
        await this.load();
        let t = this.workspaces.list.find(a => a.name === this.workspaces.current).proxies;
        let r = t.find(a => a.name === proxy.name);
        if (r) {
            Object.assign(r, proxy);
            await this.save();
        }
    }

    async clearProxies() {
        await this.load();
        this.workspaces.list.find(a => a.name === this.workspaces.current).proxies = [];
        await this.save();
    }
}

export const workspaceManager = new WorkspaceManager();