import { BKOp } from "../graph/bk";
import { State, StateNode } from "../state";
import { mkFile } from "./ops";

/**
 * Adds a cache mount to an exec operation
 * @param target 
 * @returns 
 * @example new State().run("apk add git").with(cacheMount("/var/cache/apk"))
 */
const cacheMount = (target: string) => (op?: BKOp): BKOp | undefined => {
    if (!op) throw new Error("Cannot add cache mount to undefined operation");
    if (!op.exec) throw new Error("Cannot add cache mount to non-exec operation");
    op.exec.mounts?.push({
        mountType: "CACHE",
        input: "-1",
        output: "-1",
        dest: target,
        cacheOpt: {
            "ID": target,
        }
    })
    return op;
}

/**
 * Creates a file with the given data at the given path
 * @param path The path of the file to create
 * @param data The data to write to the file
 * @returns 
 */
const createFile = (path: string, data: string) => (s: State): State => {
    const parents = s.current.node ? [s.current.node.id] : []
    return s.add(new StateNode(parents, mkFile(path, data, `[mkfile] ${path}`, 0)))
}

export {
    cacheMount,
    createFile
};
