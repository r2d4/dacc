import { BKNodeData } from "../graph/bk";
import { StateNode } from "../state/state";
import { IState } from "../state/types";
import { mkFile } from "./ops";

/**
 * Adds a cache mount to an exec operation
 * @param target 
 * @returns 
 * @example new State().run("apk add git").with(cacheMount("/var/cache/apk"))
 */
const cacheMount = (target: string) => (data?: BKNodeData): BKNodeData => {
    if (!data?.op?.exec) throw new Error("Cannot add cache mount to undefined operation");
    data.op.exec.mounts?.push({
        mountType: "CACHE",
        input: "-1",
        output: "-1",
        dest: target,
        cacheOpt: {
            "ID": target,
        }
    })
    return data;
}

/**
 * Creates a file with the given data at the given path
 * @param path The path of the file to create
 * @param data The data to write to the file
 * @returns 
 */
const createFile = (path: string, data: string) => (s: IState): IState => {
    const parents = s.current?.node ? [s.current.node.id] : []
    return s.add(new StateNode(parents, mkFile(path, data, `[mkfile] ${path}`, 0)))
}

export {
    cacheMount,
    createFile
};
