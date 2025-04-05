import prompts from "prompts";
import chalk from "chalk";
import {poster} from "./request.js";
import net from "node:net";
import {workspaceManager} from "./workspace.js";
import {R} from './../utils/base.js';
import {daemonManager} from "./server/daemon.js";

export const provider = {
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
    async addProxy({name, description, options}) {
        let {code, data, msg} = await poster.getClusters();
        if (code !== 0) {
            return R.failed(msg);
        }
        let cluster = await prompts([{
            name: 'id',
            type: 'select',
            message: "Select a cluster",
            choices: data.map(a => {
                return {title: `${chalk.yellow(a.name)}`, value: a.id};
            })
        }]);
        if (!cluster) {
            console.log(chalk.yellow('Select a service type first'));
            return;
        }
        let selectCluster = data.find(a => a.id === cluster.id);
        let type = 'path';
        if (options && options.type) {
            type = options.type;
        }
        if (type === 'svc' || type === 'pod') {
            let {code, data, msg} = await poster.getNamespaces(selectCluster.edgeId);
            if (code !== 0) {
                return R.failed(msg);
            }
            let namespace = await prompts([{
                name: 'name',
                type: 'select',
                message: "Select a Namespace",
                choices: data.map(a => {
                    return {title: `${chalk.yellow(a.metadata.name)}`, value: a.metadata.name};
                })
            }]);
            if (!namespace) {
                console.log(chalk.yellow('Select a Namespace type first'));
                return;
            }
            let selectNamespace = data.find(a => a.metadata.name === namespace.name);
            if (type === 'svc') {
                let {code, data, msg} = await poster.getServices(selectCluster.edgeId, selectNamespace.metadata.name);
                if (code !== 0) {
                    return R.failed(msg);
                }
                let service = await prompts([{
                    name: 'name',
                    type: 'select',
                    message: "Select a Namespace",
                    choices: data.filter(a => a.spec.clusterIP !== "None").map(a => {
                        return {title: `${chalk.yellow(a.metadata.name)}`, value: a.metadata.name};
                    })
                }]);
                if (!service) {
                    console.log(chalk.yellow('Select a Service first'));
                    return;
                }
                let selectService = data.find(a => a.value === cluster.name);
                let localPort = await prompts([{
                    name: 'localPort',
                    type: 'text',
                    message: "Input proxy local port"
                }]);
                if (!localPort) {
                    localPort = {
                        localPort: await provider.getRandomPort()
                    };
                }
                let config = await workspaceManager.get();
                let proxy = {
                    name, description,
                    edgeId: selectCluster.edgeId,
                    edgeName: selectCluster.name,
                    token: selectCluster.type === 'central' ? config.token : selectCluster.token,
                    host: selectService.spec.clusterIP,
                    port: selectService.spec.ports[0].port,
                    localPort: localPort.localPort
                };
                console.log(proxy);
                await workspaceManager.addProxy(proxy);
                return R.ok(true);
            }
            if (type === 'pod') {
                let {code, data, msg} = await poster.getPods(selectCluster.edgeId, selectNamespace.metadata.name);
                if (code !== 0) {
                    return R.failed(msg);
                }
                let pod = await prompts([{
                    name: 'name',
                    type: 'select',
                    message: "Select a Pod",
                    choices: data.map(a => {
                        return {title: `${chalk.yellow(a.metadata.name)}`, value: a.metadata.name};
                    })
                }]);
                if (!pod) {
                    console.log(chalk.yellow('Select a Service first'));
                    return;
                }
                let selectPod = data.find(a => a.value === cluster.name);
                let localPort = await prompts([{
                    name: 'localPort',
                    type: 'text',
                    message: "Input proxy local port"
                }]);
                if (!localPort) {
                    localPort = {
                        localPort: await provider.getRandomPort()
                    };
                }
                let config = await workspaceManager.get();
                let proxy = {
                    name, description,
                    edgeId: selectCluster.edgeId,
                    edgeName: selectCluster.name,
                    token: selectCluster.type === 'central' ? config.token : selectCluster.token,
                    host: selectPod.status.podIP,
                    port: selectPod.spec.containers[0].ports[0].containerPort,
                    localPort: localPort.localPort
                };
                console.log(proxy);
                await workspaceManager.addProxy(proxy);
                return R.ok(true);
            }
        } else {
            let host = await prompts([{
                name: 'value',
                type: 'text',
                message: "Input remote service host"
            }]);
            let port = await prompts([{
                name: 'value',
                type: 'text',
                message: "Input remote service port"
            }]);
            let localPort = await prompts([{
                name: 'localPort',
                type: 'text',
                message: "Input proxy local port"
            }]);
            let config = await workspaceManager.get();
            let proxy = {
                name, description,
                edgeId: selectCluster.edgeId,
                edgeName: selectCluster.name,
                token: selectCluster.type === 'central' ? config.token : selectCluster.token,
                host: host.value,
                port: port.value,
                localPort: localPort.localPort
            };
            console.log(proxy);
            await workspaceManager.addProxy(proxy);
            return R.ok(data);
        }
    },
    async removeProxy(name) {
        if (name) {
            if (!workspace.proxies.filter(a => a.name === name)) {
                return R.failed(`=> Proxy ${name} not found`);
            }
            await this.stopProxy(name);
            await workspaceManager.removeProxy(name);
            return R.ok(true);
        }
        let workspace = await workspaceManager.get();
        let proxy = await prompts([{
            name: 'id',
            type: 'select',
            message: "Select a cluster",
            choices: workspace.proxies.map(a => {
                return {title: `${chalk.yellow(a.name)}`, value: a.name};
            })
        }]);
        if (!proxy) {
            console.log(chalk.yellow('Select a proxy first'));
            return R.failed("not proxy selected");
        }
        await this.stopProxy(proxy.name);
        await workspaceManager.removeProxy(proxy);
        return R.ok(true);
    },
    async startProxy(name) {
        let workspace = await workspaceManager.get();
        if (!name) {
            let proxy = await prompts([{
                name: 'name',
                type: 'select',
                message: "Select a proxy",
                choices: workspace.proxies.map(a => {
                    return {title: `${chalk.yellow(a.name)}`, value: a.name};
                })
            }]);
            if (!proxy) {
                console.log(chalk.yellow('Select a proxy'));
                return;
            }
            name = proxy.name;
        }
        let t = workspace.proxies.find(a => a.name === name);
        if (!t) {
            console.log(chalk.red(`=> Proxy ${name} not found`));
            return;
        }
        try {
            let client = await daemonManager.getClient();
            return await client.send('startProxy', {
                wsUrl: workspace.host,
                port: t.localPort,
                token: t.token,
                linkHost: t.host,
                linkPort: t.port,
                linkEdgeId: t.edgeId
            });
        } catch (e) {
            console.log(chalk.red(`=> ${e.message}`));
        }
    },
    async stopProxy(name) {
        let workspace = await workspaceManager.get();
        let list = await this.getProxies();
        let map = new Map();
        list.forEach((proxy) => {
            let {edgeId, host, port} = proxy;
            let t = `${edgeId}-${host}-${port}`;
            if (!map.has(t)) {
                map.set(t, proxy);
            }
        });
        workspace.proxies.forEach((item) => {
            let {edgeId, host, port} = item;
            let t = `${edgeId}-${host}-${port}`;
            if (map.has(t)) {
                let n = map.get(t);
                item.running = true;
                item.id = n.id;
            } else {
                item.running = false;
            }
        });
        let runningProxies = workspace.proxies.filter(a => a.running);
        if (!runningProxies.length) {
            return R.failed('No running proxy');
        }
        let targetId;
        if (!name) {
            let proxy = await prompts([{
                name: 'id',
                type: 'select',
                message: "Select a proxy",
                choices: runningProxies.map(a => {
                    return {title: `${chalk.yellow(a.name)}`, value: a.id};
                })
            }]);
            if (!proxy) {
                console.log(chalk.yellow('Select a proxy'));
                return;
            }
            targetId = proxy.id;
        } else {
            let proxy = runningProxies.find(a => a.id === name);
            if (!proxy) {
                console.log(chalk.red(`=> Proxy ${name} not found`));
                return;
            }
            targetId = proxy.id;
        }
        let client = await daemonManager.getClient();
        return await client.send('stopProxy', {id: targetId});
    },
    async getProxies() {
        let client = await daemonManager.getClient();
        let {code, data} = await client.send('getProxies');
        if (code === 0) {
            return data;
        }
        return [];
    }
}