import got from "got";
import {workspaceManager} from "./workspace.js";
import {R} from './../utils/base.js';

export const poster = {
    async getRequestInfo() {
        let {host, token} = await workspaceManager.get();
        if (!host) {
            return Promise.reject("host is empty");
        }
        if (host.endsWith('/')) {
            host = host.substring(0, host.length - 1);
        }
        return {host, token};
    },
    async checkHost(host) {
        try {
            let {body} = await got({
                url: `${host}/admin/ready`,
                method: 'post'
            });
            let {code} = JSON.parse(body);
            if (code !== 0) {
                return R.failed("url is not valid");
            }
            return R.ok(true);
        } catch (e) {
            return R.failed(e.message);
        }
    },
    async post(url, data) {
        let {host, token} = await this.getRequestInfo();
        console.log('---', token, `${host}${url}`);
        return got.post(`${host}${url}`, {
            headers: {
                'X-Request-Token': token
            },
            json: data
        }).then(({body}) => {
            return JSON.parse(body);
        });
    },
    async getEdgeList() {
        return this.post('/admin/edge/list');
    },
    async getClusters() {
        return this.post('/manage/clusters');
    },
    async getNamespaces(clusterId) {
        let {code, msg, body} = await this.post("/manage/service/invoke", {
            edgeId: clusterId === 'central' ? null : clusterId,
            serviceName: 'synterix-kube-proxy',
            path: "/kube/resource/Namespace",
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            body: JSON.stringify({})
        });
        if (code === 0) {
            return JSON.parse(body);
        }
        return Promise.reject(msg);
    },
    async getServices(clusterId, namespace) {
        let {code, msg, body} = await this.post("/manage/service/invoke", {
            edgeId: clusterId === 'central' ? null : clusterId,
            serviceName: 'synterix-kube-proxy',
            path: "/kube/resource/Service",
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            body: JSON.stringify({
                namespace
            })
        });
        if (code === 0) {
            return JSON.parse(body);
        }
        return Promise.reject(msg);
    },
    async getPods(clusterId, namespace) {
        let {code, msg, body} = await this.post("/manage/service/invoke", {
            edgeId: clusterId === 'central' ? null : clusterId,
            serviceName: 'synterix-kube-proxy',
            path: "/kube/resource/Pod",
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            body: JSON.stringify({
                namespace
            })
        });
        if (code === 0) {
            return JSON.parse(body);
        }
        return Promise.reject(msg);
    }
}