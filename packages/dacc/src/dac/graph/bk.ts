import { create, fromJson, toBinary } from '@bufbuild/protobuf';
import { v4 as uuidv4 } from 'uuid';
import { Definition, DefinitionSchema, InputSchema, Op, OpJson, OpMetadata, OpMetadataJson, OpMetadataSchema, OpSchema } from '../../generated/github.com/moby/buildkit/solver/pb/ops_pb';
import { MetadataDescriptionKey } from '../common/constants';
import { Digest } from '../common/digest';
import { Graph, GraphDotConfig, Node } from './graph';

class DataNode<T> implements Node {
    constructor(readonly parents: string[], public data: T, readonly id: string = uuidv4()) { }
}

type BKNodeData = {
    op?: BKOp
    metadata: OpMetadataJson
}

type BKOp = Omit<OpJson, "inputs">

/**
 * BKNode is a node in a BuildKit graph.
 * The id is the digest of the OpSchema protobuf message.
 */
class BKNode implements DataNode<BKNodeData> {
    readonly id: string;
    constructor(readonly parents: string[], public data: BKNodeData) {
        this.id = this.digest().toString();
        parents.forEach(p => {
            if (!Digest.validate(p)) {
                throw new Error(`Invalid parent digest: ${p}`);
            }
        })
    }

    toPb(): { op: Op, metadata: OpMetadata } {
        return {
            op: create(OpSchema, {
                ...fromJson(OpSchema, this.data.op || {}),
                inputs: this.parents.map(d => (create(InputSchema, { digest: d })))
            }),
            metadata: fromJson(OpMetadataSchema, this.data.metadata),
        }
    }

    digest(): Digest {
        return Digest.create("sha256", toBinary(OpSchema, this.toPb().op));
    }
}

/**
 * BKGraph is a graph of BuildKit nodes.
 * The graph is a directed acyclic graph.
 */
class BKGraph extends Graph<BKNode> {
    private buildImage: string = "ghcr.io/r2d4/llb:1.0.1"

    constructor() {
        super();
    }

    toBase64Definition(): string {
        const proto = toBinary(DefinitionSchema, this.toDefinition());
        const binaryString = proto.reduce((str, byte) => str + String.fromCharCode(byte), '');
        return btoa(binaryString)
    }

    toConfig(): string {
        return `#syntax=${this.buildImage}\n${this.toBase64Definition()}`
    }

    static fromGraph<T extends DataNode<BKNodeData>>(g: Graph<T>): BKGraph {
        const graph = new BKGraph();
        const sorted = g.sort();
        const idToDigest = new Map<string, string>();
        for (const node of sorted) {
            if (!node) {
                continue
            }
            const parents = node.parents.map(p => idToDigest.get(p));
            if (parents.some(p => p === undefined)) {
                throw new Error(`Parent not found for node: ${node.id}`);
            }
            const newNode = new BKNode(parents.filter((p): p is string => p !== undefined), node.data);
            graph.add(newNode);
            idToDigest.set(node.id, newNode.id);
        }
        return graph;
    }

    toDefinition(): Definition {
        const m = this.nodes;
        const def = Array<Uint8Array>();
        const metadata: { [key: string]: OpMetadata } = {};

        m.forEach((node, id) => {
            const pb = node.toPb()
            metadata[id] = pb.metadata;
            def.push(toBinary(OpSchema, pb.op));
        })

        return create(DefinitionSchema, {
            def,
            metadata,
        })
    }

    toDot(config: GraphDotConfig<BKNode> = {
        nodeLabel: (n) => n.data.metadata.description ? n.data.metadata.description[MetadataDescriptionKey.CustomName] : n.id,
    }): string {
        return super.toDot(config);
    }
}

export { BKGraph, BKNode, BKNodeData, BKOp, DataNode };

