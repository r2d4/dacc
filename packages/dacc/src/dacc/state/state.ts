import { toBinary } from "@bufbuild/protobuf";
import { DockerRegistryClient, ImageReference, OCIImageConfig } from "@dacc/oci";
import { DefinitionSchema, PlatformJson } from '../../generated/github.com/moby/buildkit/solver/pb/ops_pb';
import { builder, builderVersion, CapID, DefaultLinuxEnv, LLBDefinitionFilename, MetadataDescriptionKey, OpAttr } from "../common/constants";
import { DockerClient } from "../docker/client";
import { BKGraph, BKNode, BKNodeData, DataNode } from "../graph/bk";
import { Graph, GraphDotConfig } from "../graph/graph";
import { contextNode, copy, diff, from, getArch, mkFile, nested, run, workdir } from "../patterns/ops";
import { Image } from "./image";
import { IState, StateDataOp, StateMetadata, StateOp, StateProps, StateReference } from "./types";

/**
 * Represents a node in the build graph.
 */
export class StateNode extends DataNode<BKNodeData> { }

const defaultStateProps: Required<StateProps> = {
    client: new DockerClient(),
    registry: new DockerRegistryClient(),
    platform: {
        OS: "linux",
        Architecture: getArch(),
    }
};

export class State implements IState {
    private platform: PlatformJson;

    private metadata: StateMetadata = {
        cwd: "/",
        labels: new Map(),
        env: DefaultLinuxEnv,
    }

    private context: StateNode | null;
    private g: Graph<StateNode> = new Graph<StateNode>();
    private head?: StateNode;

    private _image: Image;

    private registry: DockerRegistryClient;

    /**
    * Creates a new State instance.
    * @param props - The properties to initialize the State with.
    */
    constructor(props: StateProps = {}) {
        this.platform = props.platform ?? defaultStateProps.platform;
        this._image = new Image(this, props.client ?? defaultStateProps.client);
        this.registry = props.registry ?? defaultStateProps.registry;
        this.metadata.labels.set("r2d4.dacc.version", builderVersion);
        this.metadata.labels.set("r2d4.dacc.builder", builder);
    }

    get image(): Image {
        return this._image;
    }

    get current(): StateReference {
        return {
            node: this.head,
            metadata: this.metadata
        };
    }

    async from(identifier: string, platform?: PlatformJson, opts?: {
        skipPull?: boolean;
    }): Promise<IState> {
        const ref = ImageReference.parse(identifier);
        if (!platform) platform = this.platform;
        const node = new StateNode([], from(ref, platform));
        this.platform = platform || this.platform;
        if (!opts?.skipPull) {
            await this.registry.getImageConfig(ref).then(ic => {
                const icEnv = new Map<string, string>();
                ic.config?.Env?.forEach(e => {
                    const [key, value] = e.split("=");
                    icEnv.set(key, value);
                })
                this.metadata.env = icEnv;
                this.metadata.command = ic.config?.Cmd;
                this.metadata.entrypoint = ic.config?.Entrypoint;
            })
        }
        this.add(node);
        return this;
    }

    with(...opts: StateDataOp[]): IState {
        if (!this.head?.data) throw new Error("No head node found")
        this.head.data = opts.reduce((d, op) => op(d), this.head.data);
        return this;
    }

    branch(ref?: StateReference): State {
        this.head = ref?.node;
        this.metadata = ref?.metadata || this.metadata;
        return this;
    }

    parallel(...ops: StateOp[]): StateNode[] {
        const originalHead = this.head;
        const resultNodes = ops.map(op => this.executeAndReturn(op));
        this.head = originalHead;
        return resultNodes;
    }

    nested(other: State): IState {
        const def = toBinary(DefinitionSchema, other.output().toDefinition());
        const mnt = this.add(new StateNode([], mkFile(`/${LLBDefinitionFilename}`, def)))
        if (!mnt.current?.node?.id) throw new Error("No node id found")
        const parents = this.head ? [mnt.current.node.id, this.head.id] : [mnt.current.node.id];
        return this.add(new StateNode(parents, nested()))
    }

    cmd(cmd: string | string[]) {
        if (typeof cmd === "string") cmd = [cmd];
        this.metadata.command = cmd;
        return this;
    }

    entrypoint(entrypoint: string | string[]) {
        if (typeof entrypoint === "string") entrypoint = [entrypoint];
        this.metadata.entrypoint = entrypoint;
        return this;
    }

    author(author: string): IState {
        this.metadata.author = author;
        return this;
    }

    label(kv: Record<string, string>): IState {
        Object.entries(kv).forEach(([key, value]) => this.metadata.labels.set(key, value));
        return this;
    }

    toConfig(node?: StateNode): string {
        const def = this.output(node).toBase64Definition();
        const imageConfig: Partial<OCIImageConfig> = {
            created: new Date(0),
            author: this.metadata.author,
            os: this.platform.OS,
            "os.version": this.platform.OSVersion,
            architecture: this.platform.Architecture,
            config: {
                Cmd: this.metadata.command,
                Entrypoint: this.metadata.entrypoint,
                Env: Array.from(this.metadata.env.entries()).map(([key, value]) => `${key}=${value}`),
                WorkingDir: this.metadata.cwd,
                Labels: Object.fromEntries(this.metadata.labels.entries()),
            },
        }
        return `#syntax=${builder}:${builderVersion}\n${JSON.stringify({
            imageConfig,
            definition: def,
        })}`
    }

    toJSON(node?: StateNode): StateNode[] {
        return this.output(node).toJSON();
    }

    toDot(node?: StateNode, config?: GraphDotConfig<BKNode>): string {
        return this.output(node).toDot(config);
    }

    env(key: string, value: string): IState {
        this.metadata.env.set(key, value);
        return this;
    }

    add(node: StateNode, setHead: boolean = true): IState {
        this.g.add(node);
        if (setHead) this.head = node;
        return this;
    }

    workdir(path: string): IState {
        this.metadata.cwd = path;
        const parents = new Set<string>()
        if (this.head) parents.add(this.head.id);
        this.add(new StateNode(Array.from(parents), workdir(path)))
        return this;
    }

    run(command: string): IState {
        const parents = new Set<string>()
        if (this.head) parents.add(this.head.id);
        this.add(new StateNode(Array.from(parents), run(command, this.metadata.env, this.metadata.cwd)));
        return this;
    }

    script(script: string[] | string): IState {
        if (typeof script === "string") script = [script];
        script = script.map(s => s.trim().replace(/\t/g, " "));
        const mkFileOp = mkFile("/EOF", script.join("\n"));
        const mkFileNode = new StateNode([], mkFileOp);
        this.add(mkFileNode, false);
        const runOp = run("/dev/pipes/EOF", this.metadata.env, "/");
        runOp.op?.exec?.mounts?.push({
            input: "1",
            selector: "/",
            dest: "/dev/pipes/",
            output: "-1",
            readonly: true,
        })
        if (runOp.metadata.description) {
            runOp.metadata.description[MetadataDescriptionKey.CustomName] = "[script] " + script.join(" && ");
        }
        runOp.metadata.caps && (runOp.metadata.caps[CapID.ExecMountSelector] = true);
        const parents = new Set<string>()
        if (this.head) parents.add(this.head.id);
        parents.add(mkFileNode.id);
        this.add(new StateNode(Array.from(parents), runOp));
        return this
    }

    merge(inputs: StateNode[]): IState {
        const parents = inputs.map(i => i.id);
        const node = new StateNode(parents, {
            op: {
                merge: {
                    inputs: parents.map((_, index) => ({ input: index.toString() })),
                }
            },
            metadata: {
                description: {
                    [MetadataDescriptionKey.CustomName]: "[merge] " + inputs.map(i => i.data.metadata.description?.[MetadataDescriptionKey.CustomName]).join(", "),
                }
            }
        })
        this.add(node);
        return this;
    }

    do(op: StateOp): IState {
        return op(this);
    }

    diff(op: StateOp): IState {
        const lower = this.head;
        const upper = op(this).current?.node;
        if (!lower || !upper) throw new Error("Expected two nodes to diff")
        this.add(diff(lower, upper))
        return this;
    }

    copy(src: string[] | string, dest: string, from?: StateReference): State {
        if (typeof src === "string") src = [src];
        const parents = new Set<string>()
        if (this.head) parents.add(this.head.id);
        if (!from?.node) {
            const ctx = this.updateContext(src);
            parents.add(ctx.id);
        } else {
            parents.add(from.node?.id);
        }
        const input = this.head ? 0 : -1;
        const secondaryInput = parents.size - 1;
        const node = new StateNode(Array.from(parents), copy(src, dest, input, secondaryInput, parents.size, this.metadata.cwd))
        this.add(node);
        return this;
    }

    private executeAndReturn(op: StateOp): StateNode {
        const originalHead = this.head;
        op(this);
        const resultNode = this.head;
        this.head = originalHead;
        return resultNode!;
    }

    private output(node?: StateNode): BKGraph {
        const outputNode = node || this.head;
        const c = this.g.copy();
        if (!outputNode) throw new Error("No output node found")
        c.add(new StateNode([outputNode.id], {
            metadata: {
                caps: {
                    [CapID.Constraints]: true,
                    [CapID.Platform]: true,
                    [CapID.MetaDescription]: true,
                }
            }
        }));
        const bk = BKGraph.fromGraph(c)
        return bk;
    }

    private updateContext(paths: string[]): StateNode {
        if (!this.context) {
            this.context = new StateNode([], contextNode(paths));
            this.add(this.context, false);
            return this.context;
        }
        const existingPaths = JSON.parse(this.context.data.op?.source?.attrs?.[OpAttr.FollowPaths] || "[]");
        const pathSet = new Set<string>(existingPaths);
        paths.forEach(p => pathSet.add(p));
        const newContext = new StateNode([], contextNode(Array.from(pathSet)), this.context.id);
        this.g.update(newContext.id, newContext);
        this.context = newContext;
        return newContext;
    }
}

