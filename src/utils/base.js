import net from "node:net";

export const R = {
    ok(data) {
        return {code: 0, data};
    },
    failed(msg) {
        return {code: 1, msg};
    }
};

export function getRandomPort() {
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
};