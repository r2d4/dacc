import { arch } from 'os';
import * as path from 'path';
import { split } from 'shlex';
import { PlatformJson } from '../generated/es/github.com/moby/buildkit/solver/pb/ops_pb';
import { CapID, ContextIdentifier, LLBDefinitionFilename, MetadataDescriptionKey, OpAttr } from './constants';
import { BKNodeData, BKOp, DataNode } from './graph/bk';

export type OpOption = (op?: BKOp) => BKOp | undefined;

export function from(identifier: string, platform?: PlatformJson): BKNodeData {
    const { normalizedReference } = resolveDockerImageReference(identifier);
    return {
        op: {
            source: {
                identifier: `docker-image://${normalizedReference}`,
            },
            platform,
            constraints: {},
        },
        metadata: {
            caps: {
                [CapID.SourceImage]: true,
            },
            description: {
                [MetadataDescriptionKey.CustomName]: `[from] ${identifier}`,
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



export function copy(src: string | string[], dest: string, initialInput: number, secondaryInput: number, inputs: number): BKNodeData {
    const srcs = Array.isArray(src) ? src : [src];
    return {
        op: {
            file: {
                actions: srcs.map((src, index) => ({
                    input: (index === 0 ? initialInput : inputs + index).toString(),
                    secondaryInput: secondaryInput.toString(),
                    output: (index === srcs.length - 1 ? 0 : -1).toString(),
                    copy: {
                        src: path.resolve("/", src),
                        dest: path.resolve(dest),
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

interface DockerImageReference {
    registry: string;
    repository: string;
    tag: string;
    digest: string | null;
    normalizedReference: string;
}


function resolveDockerImageReference(reference: string): DockerImageReference {
    // Default values
    let registry = 'docker.io';
    let repository = '';
    let tag = 'latest';
    let digest: string | null = null;

    // Split the reference into parts
    const parts = reference.split('/');

    // Check if the first part could be a registry
    if (parts.length > 1 && (parts[0].includes('.') || parts[0].includes(':'))) {
        registry = parts.shift()!;
    }

    // The remaining parts form the repository
    repository = parts.join('/');

    // Check for tag or digest
    const tagOrDigestSplit = repository.split('@');
    if (tagOrDigestSplit.length > 1) {
        // We have a digest
        repository = tagOrDigestSplit[0];
        digest = tagOrDigestSplit[1];
    } else {
        // Check for tag
        const tagSplit = repository.split(':');
        if (tagSplit.length > 1) {
            repository = tagSplit[0];
            tag = tagSplit[1];
        }
    }

    // Handle official images
    if (!repository.includes('/') && registry === 'docker.io') {
        repository = 'library/' + repository;
    }

    // Create normalized reference string
    let normalizedReference = `${registry}/${repository}:${tag}`;
    if (digest) {
        normalizedReference += `@${digest}`;
    }

    return { registry, repository, tag, digest, normalizedReference };
}