import { ImageReference } from '@dacc/oci';
import { arch } from 'os';
import * as path from 'path';
import { split } from 'shlex';
import { PlatformJson } from '../../generated/github.com/moby/buildkit/solver/pb/ops_pb';
import { CapID, ContextIdentifier, LLBDefinitionFilename, MetadataDescriptionKey, OpAttr } from '../common/constants';
import { BKNodeData, BKOp, DataNode } from '../graph/bk';

export type OpOption = (op?: BKOp) => BKOp | undefined;

export function from(ref: ImageReference, platform?: PlatformJson): BKNodeData {
    return {
        op: {
            source: {
                identifier: `docker-image://${ref.toString()}`,
            },
            platform,
            constraints: {},
        },
        metadata: {
            caps: {
                [CapID.SourceImage]: true,
            },
            description: {
                [MetadataDescriptionKey.CustomName]: `[from] ${ref.toString()}`,
            },
        }
    };
}

export function nested(): BKNodeData {
    return {
        op: {
            build: {
                builder: "-1",
                inputs: {
                    [LLBDefinitionFilename]: { input: "0" }
                },
            }
        },
        metadata: {
            description: {
                [MetadataDescriptionKey.CustomName]: "[nested build]",
            }
        }
    }
};


export function diff(lower: DataNode<BKNodeData>, upper: DataNode<BKNodeData>): DataNode<BKNodeData> {
    return new DataNode<BKNodeData>([lower.id, upper.id], {
        op: {
            diff: {
                lower: { input: "0" },
                upper: { input: "1" },
            }
        },
        metadata: {
            description: {
                [MetadataDescriptionKey.CustomName]: "[diff] " + [lower, upper].map(i => i.data.metadata.description?.[MetadataDescriptionKey.CustomName]).join(", "),
            }
        }
    })
}

export function copy(src: string | string[], dest: string, initialInput: number, secondaryInput: number, inputs: number, cwd: string): BKNodeData {
    const srcs = Array.isArray(src) ? src : [src];
    return {
        op: {
            file: {
                actions: srcs.map((src, index) => ({
                    input: (index === 0 ? initialInput : inputs + index - 1).toString(),
                    secondaryInput: secondaryInput.toString(),
                    output: (index === srcs.length - 1 ? 0 : -1).toString(),
                    copy: {
                        src: path.resolve("/", src),
                        dest: path.resolve("/", cwd, dest) + (srcs.length > 1 || srcs.some(s => s.includes("*")) ? "/" : ""),
                        mode: -1,
                        timestamp: "-1",
                        createDestPath: true,
                        allowEmptyWildcard: true,
                        dirCopyContents: true,
                        followSymlink: true,
                        allowWildcard: true,
                    }
                }))
            },
            constraints: {},
        },
        metadata: {
            caps: {
                [CapID.FileBase]: true,
            },
            description: {
                [MetadataDescriptionKey.CustomName]: `[copy] src=${src} dest=${dest}`,
            }
        }
    };
}

export function run(command: string, env: Map<string, string>, cwd?: string): BKNodeData {
    return {
        op: {
            exec: {
                meta: {
                    args: split(`/bin/sh -c "${command}"`),
                    env: Array.from(env.entries()).map(([key, value]) => `${key}=${value}`),
                    cwd,
                    removeMountStubsRecursive: true,
                },
                mounts: [
                    {
                        input: "0",
                        output: "0",
                        dest: "/",
                    }
                ]
            },
        },
        metadata: {
            description: {
                [MetadataDescriptionKey.CustomName]: `[run] ${command}`,
            }
        }
    };
}

export function workdir(path: string): BKNodeData {
    return {
        op: {
            file: {
                actions: [
                    {
                        input: "0",
                        secondaryInput: "-1",
                        output: "0",
                        mkdir: {
                            path,
                            mode: 493,
                            makeParents: true,
                            timestamp: "-1",
                        }
                    }
                ]
            }
        },
        metadata: {
            caps: {
                [CapID.FileBase]: true,
            },
            description: {
                [MetadataDescriptionKey.CustomName]: `[workdir] ${path}`,
            }
        }
    };
}

export function mkFile(path: string, data: string, description?: string): BKNodeData {
    return {
        op: {
            file: {
                actions: [{
                    input: "-1",
                    secondaryInput: "-1",
                    mkfile: {
                        path,
                        mode: 493,
                        data,
                        timestamp: "-1",
                    }
                }]
            }
        },
        metadata: {
            caps: {
                [CapID.FileBase]: true,
            },
            description: {
                [MetadataDescriptionKey.CustomName]: description ?? "[internal] preparing inline document",
            }
        }
    };
}

export function contextNode(paths: string[]): BKNodeData {
    const sorted = paths.sort();
    return {
        op: {
            source: {
                identifier: ContextIdentifier,
                attrs: {
                    [OpAttr.FollowPaths]: JSON.stringify(sorted),
                    [OpAttr.SharedKeyHint]: "context",
                    [OpAttr.LocalUniqueID]: "ctx" + Math.random().toString(36).substring(7),
                }
            },
            constraints: {},
        },
        metadata: {
            caps: {
                [CapID.SourceLocal]: true,
                [CapID.SourceLocalFollowPaths]: true,
                [CapID.SourceLocalUnique]: true,
                [CapID.SourceLocalSharedKeyHint]: true,
            },
            description: {
                [MetadataDescriptionKey.CustomName]: `[load] ${sorted.join(",")}`,
            }
        }
    };
}

export function getArch(): string {
    switch (arch()) {
        case "x64":
            return "amd64"
        case "arm":
            return "arm"
        case "arm64":
            return "arm64"
        default:
            return "amd64"
    }
}

