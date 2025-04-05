#!/usr/bin/env node

import chalk from "chalk";
import {program} from 'commander';
import {ClimtTable} from 'climt';
import {workspaceManager} from '../src/base/workspace.js';
import {poster} from "../src/base/request.js";
import {provider} from "../src/base/provider.js";
import {formatHelp} from "../src/utils/help.js";

program.configureHelp({
    formatHelp: (cmd) => formatHelp(cmd)
});
program
    .name('synterix')
    .description('Synterix CLI toolkit')
    .version('1.0.0');

const workspace = program.command('workspace')
    .alias("ws")
    .description('Manage local workspaces');
workspace.command('create')
    .description('create a new workspace')
    .argument('<name>', 'name')
    .action(async (name) => {
        let list = await workspaceManager.getList();
        if (list.find(a => a.name === name)) {
            console.log(chalk.red(`=> Workspace ${name} already exists`));
            return;
        }
        await workspaceManager.create(name);
    });
workspace.command('remove')
    .description('remove a workspace')
    .argument('<name>', 'name')
    .action(async (name) => {
        let list = await workspaceManager.getList();
        if (!list.find(a => a.name === name)) {
            console.log(chalk.red(`=> Workspace ${name} not found`));
            return;
        }
        await workspaceManager.remove(name);
    });
workspace.command('toggle')
    .description('toggle a workspace as default')
    .argument('<name>', 'name')
    .action(async (name) => {
        let list = await workspaceManager.getList();
        if (!list.find(a => a.name === name)) {
            console.log(chalk.red(`=> Workspace ${name} not found`));
            return;
        }
        await workspaceManager.toggle(name);
    });
workspace.command('list')
    .description('list all local workspace')
    .action(async () => {
        let info = await workspaceManager.getAll();

        const table = new ClimtTable();
        table.column('Name', 'name');
        table.column('Current', 'current');
        table.column('Host', 'host');
        table.column('Token', 'token');

        let list = info.list.map(a => {
            return {...a, current: a.name === info.current};
        });
        table.render(list);
    });
workspace.command('host')
    .description('set a workspace host')
    .argument('<host>', 'host')
    .option('-n, --name <name>', 'workspace name')
    .action(async (host, options) => {
        let all = await workspaceManager.getAll();
        let name = options.name;
        if (!name) {
            name = all.current;
        }
        let list = all.list;
        if (!list.find(a => a.name === name)) {
            console.log(chalk.red(`=> Workspace ${name} not found`));
            return;
        }
        let {code, msg} = await poster.checkHost(host);
        if (code !== 0) {
            console.log(chalk.red(`=> ${msg}`));
        }
        await workspaceManager.setHost(name, host);
    });
workspace.command('token')
    .description('set a workspace token')
    .argument('<token>', 'token')
    .option('-n, --name <name>', 'workspace name')
    .action(async (token, options) => {
        let all = await workspaceManager.getAll();
        let name = options.name;
        if (!name) {
            name = all.current;
        }
        let list = all.list;
        if (!list.find(a => a.name === name)) {
            console.log(chalk.red(`=> Workspace ${name} not found`));
            return;
        }
        await workspaceManager.setToken(name, token);
    });

const proxies = program.command('proxy')
    .alias("px")
    .description('Manage local proxies');
proxies.command('add')
    .description('create a new proxy')
    .argument(' <name>', 'name')
    .argument('[description]', 'description')
    .option('-t, --type <type>', 'create type svc | pod | path default path')
    .action(async (name, description, options) => {
        try {
            let {code, msg} = await provider.addProxy({name, description, options});
            if (code !== 0) {
                console.log(chalk.red(`=> ${msg}`));
            }
        } catch (e) {
            console.log(chalk.red(`=> ${e}`))
        }
    });
proxies.command('remove')
    .description('remove a proxy')
    .argument(' <name>', 'name')
    .action(async (name) => {
        try {
            let {code, msg} = await provider.removeProxy(name);
            if (code !== 0) {
                console.log(chalk.red(`=> ${msg}`));
            }
        } catch (e) {
            console.log(chalk.red(`=> ${e}`))
        }
    });
proxies.command('list')
    .description('list all local proxies')
    .action(async () => {
        let workspace = await workspaceManager.get();
        const table = new ClimtTable();
        table.column('Name', 'name');
        table.column('Description', 'description');
        table.column('EdgeName', 'edgeName');
        table.column('EdgeId', 'edgeId');
        table.column('TcpHost', 'host');
        table.column('TcpPort', 'port');
        table.column('LocalPort', 'localPort');
        table.column('Running', 'running');
        let list = await provider.getProxies();
        let map = new Map();
        list.forEach(({edgeId, host, port}) => {
            let t = `${edgeId}-${host}-${port}`;
            if (!map.has(t)) {
                map.set(t, true);
            }
        });
        workspace.proxies.forEach((item) => {
            let {edgeId, host, port} = item;
            let t = `${edgeId}-${host}-${port}`;
            item.running = map.has(t);
        });
        table.render(workspace.proxies);
        process.exit(0);
    });
proxies.command('start')
    .description('start a proxy')
    .argument('[name]', 'name')
    .action(async (name) => {
        let r = await provider.startProxy(name);
        console.log(r);
        process.exit(0);
    });
proxies.command('stop')
    .description('stop a proxy')
    .argument('[name]', 'name')
    .action(async (name) => {
        let r = await provider.stopProxy(name);
        console.log(r);
        process.exit(0);
    });

program.parse(process.argv);