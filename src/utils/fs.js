import Path from 'node:path';
import fs from 'node:fs/promises';

export async function isExist(path) {
    try {
        await fs.access(path);
        return true;
    } catch (_) {
        return false;
    }
}

export async function isDirectory(path) {
    let t = await fs.stat(path);
    return t.isDirectory();
}

export async function getAllFiles(path) {
    if (await isDirectory(path)) {
        let r = [];
        await Promise.all((await fs.readdir(path)).map(async file => {
            let target = Path.resolve(path, `./${file}`);
            if (isDirectory(target)) {
                r.push(...await getAllFiles(target));
            } else {
                r.push(target);
            }
        }));
        return r;
    }
    return [path];
}

export async function mkdir(path) {
    if (!await isExist(path)) {
        let r = [], check = async (target) => {
            if (!await isExist(target)) {
                r.push(target);
                return check(Path.resolve(target, './../'));
            }
        }
        await check(path);
        return r.reverse().reduce((a, b) => {
            return a.then(() => fs.mkdir(b));
        }, Promise.resolve());
    }
}

export async function touch(path) {
    if (await isExist(path)) {
        return;
    }
    try {
        await mkdir(Path.resolve(path, './../'));
    } catch (_) {
    }
    let filehandle;
    try {
        filehandle = await fs.open(path, "w");
    } finally {
        await filehandle?.close();
    }
}

export async function readFile(path, option) {
    await fs.access(path);
    return fs.readFile(path, option);
}

export async function writeFile(path, content, option) {
    await touch(path);
    await fs.access(path);
    return fs.writeFile(path, content, option);
}

export async function readJSON(path) {
    let content = await readFile(path);
    return JSON.parse(content);
}

export async function writeJSON(path, content) {
    return writeFile(path, JSON.stringify(content));
}

export async function setJSON(path, fn) {
    let json = await readJSON(path);
    await Promise.resolve().then(() => fn(json));
    return writeJSON(path, json);
}

export async function copy(path, toPath) {
    if (await isDirectory(path)) {
        return (await getAllFiles(path)).reduce((a, b) => {
            return a.then(async () => {
                let target = Path.resolve(toPath, `./${Path.relative(path, b)}`);
                await touch(target);
                return fs.copyFile(b, target);
            });
        }, Promise.resolve());
    } else {
        await touch(toPath);
        return fs.copyFile(path, toPath);
    }
}

export async function remove(path) {
    if (!await isExist(path)) {
        return;
    }
    if (await isDirectory(path)) {
        let check = async (target) => {
            let list = await fs.readdir(target);
            await Promise.all(list.map(a => Path.resolve(target, `./${a}`)).map(async a => {
                if (await isDirectory(a)) {
                    await check(a);
                } else {
                    await fs.unlink(a);
                }
            }));
            return fs.rmdir(target);
        }
        return check(path);
    }
    return fs.unlink(path);
}

export async function chmod(path, ...args) {
    return fs.chmod(path, ...args);
}

export async function readContent(path) {
    if (await isExist(path)) {
        let r = await readFile(path);
        return r.toString();
    }
    return null;
}

export async function writeContent(path, content) {
    if (!await isExist(path)) {
        await touch(path);
    }
    return writeFile(path, content);
}