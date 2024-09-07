import { BKOp } from "../graph/bk";

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

export {
    cacheMount
};
