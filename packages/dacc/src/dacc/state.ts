import { toBinary } from "@bufbuild/protobuf";
import { DefinitionSchema, PlatformJson } from '../generated/github.com/moby/buildkit/solver/pb/ops_pb';
import { CapID, DefaultLinuxEnv, LLBDefinitionFilename, MetadataDescriptionKey, OpAttr } from "./common/constants";
import { Digest } from "./common/digest";
import { CommandOutput, DockerBuildOptions, DockerClient, DockerRunOptions } from "./docker/client";
import { OCIImage } from "./docker/oci";
import { BKGraph, BKNode, BKNodeData, DataNode } from "./graph/bk";
import { Graph, GraphDotConfig } from "./graph/graph";
import { contextNode, copy, diff, from, getArch, mkFile, nested, OpOption, run, workdir } from "./patterns/ops";

export type StateProps = {
    /**
     * The Docker build client to use for building images.
     * Defaults to a new DockerBuildClient instance.
     */
    client?: DockerClient;
    /**
     * The platform to use for the build.
     * Defaults to the current platform.
     */
    platform?: PlatformJson;
};

const defaultStateProps: Required<StateProps> = {
    client: new DockerClient(),
    platform: {
        OS: "linux",
        Architecture: getArch(),
    }
};

/**
 * Represents a node in the build graph.
 */
export class StateNode extends DataNode<BKNodeData> { }

/**
 * Represents an empty build context in a Docker build process.
 * 
 * This constant is used to indicate a "scratch" or completely empty starting 
 * point for a build, equivalent to the `FROM scratch` instruction in a Dockerfile.
 * 
 * @constant
 * @type {undefined}
 * 
 * @example
 * // Start a build from scratch
 * const state = new State().from(SCRATCH);
 */
export const SCRATCH = undefined;

/**
 * State provides a high-level API for building and running Docker images.
 * It maintains a directed acyclic graph (DAG) of build steps and operations.
 */
export interface IState {

    /**
     * The Docker image instance associated with the current State.
     */
    image: Image;

    /**
     * The current head node of the build graph.
     */
    current: StateNode | undefined;

    /**
     * Converts the current state to a docker-buildable file.
     * It can be built using docker build -f <file> .
     * @param node - The node to use as the output. If not provided, uses the current head.
     * @returns The BuildKit configuration as a string.
     */
    toConfig(node?: StateNode): string;

    /**
     * Converts the current state to a JSON representation.
     * @param node - The node to use as the output. If not provided, uses the current head.
     * @returns The JSON representation of the state.
     */
    toJSON(node?: StateNode): any;

    /**
    * Generates a DOT graph representation of the current state.
    * @param node - The node to use as the output. If not provided, uses the current head.
    * @param config - Configuration options for the DOT graph generation.
    * @returns The DOT graph representation as a string.
    */
    toDot(node?: StateNode, config?: GraphDotConfig<BKNode>): string;

    /**
    * Applies a state operation to the current state.
    * Use this method to apply higher-level operations to the state, (e.g., a reusable set of operations).
    * @param op - The state operation to apply.
    * @returns The current State instance.
    */
    do(op: StateOp): IState;

    /**
     * Adds a new node to the build graph.
     * Useful for adding custom operations to the build graph.
     * @param node - The node to add.
     * @param setHead - Whether to set the new node as the head. Defaults to true.
     * @returns The current State instance.
     */
    add(node: StateNode, setHead?: boolean): IState;

    /**
     * Adds a new 'FROM' instruction to the build graph.
     * @param identifier - The Docker image identifier to use as the base.
     * @param platform - The platform to use for the image. Defaults to the current platform.
     * @returns The current State instance.
     */
    from(identifier: string, platform?: PlatformJson): IState;

    /**
    * Nests another State instance within the current one.
    * @param other - The State instance to nest.
    * @returns The current State instance.
    */
    nested(other: IState): IState;
    /**
      * Executes multiple operations in parallel and returns the resulting nodes.
      * @param ops - The operations to execute in parallel.
      * @returns An array of the resulting nodes from each parallel operation.
      */
    parallel(...ops: StateOp[]): StateNode[];

    /**
     * Creates a new branch in the build graph.
     * @param node - The node to set as the head of the new branch. If not provided, creates a new branch from the current head.
     * @returns The current State instance.
     */
    branch(node?: StateNode): IState;

    /**
    * Sets an environment variable for subsequent operations.
    * @param key - The name of the environment variable.
    * @param value - The value of the environment variable.
    * @returns The current State instance.
    */
    env(key: string, value: string): IState;

    /**
     * Sets the working directory for subsequent operations.
     * @param path - The path to set as the working directory.
     * @returns The current State instance.
     */
    workdir(path: string): IState;

    /**
     * Adds a RUN instruction to the build graph.
     * @param command - The command to run.
     * @returns The current State instance.
     */
    run(command: string): IState;

    /**
    * Adds a script to be executed in the build process.
    * Scripts are executed in a heredoc-like environment.
    * A script only results in a single layer in the final image.
    * @param script - The script or array of script lines to execute.
    * @returns The current State instance.
    */
    script(script: string[] | string): IState;

    /**
     * Merges multiple input nodes into a single node.
     * @param inputs - The nodes to merge.
     * @returns The current State instance.
     */
    merge(inputs: StateNode[]): IState;

    /**
     * Computes the difference between the current state and the state after applying an operation.
     * @param op - The state operation to apply for the diff.
     * @returns The current State instance.
     */
    diff(op: StateOp): IState;

    /**
     * Copies files or directories from either the build context or a source node to the current working directory.
     * @param src - The source path(s) to copy from.
     * @param dest - The destination path to copy to.
     * @param from - The source node to copy from. If not provided, uses the current context.
     * @returns The current State instance.
     */
    copy(src: string[] | string, dest: string, from?: StateNode): IState;

    /**
    * Applies one or more operation options to the current head node.
    * @param opts - The operation options to apply.
    * @returns The current State instance.
    */
    with(...opts: OpOption[]): IState;
}

/**
 * Image provides a high-level API for building and running Docker images.
 * based on a State instance.
 */
export class Image {
    constructor(private state: State, private client: DockerClient) { }

    /**
     * Builds the current state into a Docker image.
     * @param opts - The options to use for the build operation.
     * @returns The stdout output of the build process.
     */
    async build(opts: DockerBuildOptions & { node?: StateNode } = {}): Promise<CommandOutput & { tag: string }> {
        const tag = this.tag(opts.node)
        opts.tag = opts.tag || []
        opts.tag.push(tag)

        return new Promise(
            resolve => this.client.build(this.state.toConfig(opts.node), opts.contextPath, opts)
                .then(output => resolve({ ...output, tag }))
        )
    }

    /**
     * Runs the current state as a Docker container.
     * @param opts - The options to use for the run operation.
     * @returns The stdout output of the run process.
     */
    async run(opts?: {
        run?: DockerRunOptions,
        build?: DockerBuildOptions,
    }): Promise<CommandOutput> {
        return await this.build(opts?.build).then(({ tag }) => this.client.run(tag, opts?.run));
    }

    private tag(node?: StateNode): string {
        return `dacc-${Digest.create("sha256", new TextEncoder().encode(this.state.toConfig(node))).toHex().slice(0, 8)}`
    }
}

type StateMetadata = {
    cwd: string;
    env: Map<string, string>;

    labels: Map<string, string>;
    author?: string;

    command?: string[];
    entrypoint?: string[];
}

export class State implements IState {
    private platform: PlatformJson;

    private builder: string = `ghcr.io/r2d4/llb`;
    private builderVersion: string = "1.0.3";

    private metadata: StateMetadata = {
        cwd: "/",
        labels: new Map(),
        env: DefaultLinuxEnv,
    }

    private context: StateNode | null;
    private g: Graph<StateNode> = new Graph<StateNode>();
    private head?: StateNode;

    private _image: Image;

    /**
    * Creates a new State instance.
    * @param props - The properties to initialize the State with.
    */
    constructor(props: StateProps = {}) {
        this.platform = props.platform ?? defaultStateProps.platform;
        this._image = new Image(this, props.client ?? defaultStateProps.client);
        this.metadata.labels.set("r2d4.dacc.version", this.builderVersion);
        this.metadata.labels.set("r2d4.dacc.builder", this.builder);
    }

    get image(): Image {
        return this._image;
    }

    get current(): StateNode | undefined {
        return this.head;
    }

    from(identifier: string, platform?: PlatformJson): State {
        if (!platform) platform = this.platform;
        const node = new StateNode([], from(identifier, platform));
        this.platform = platform || this.platform;
        this.add(node);
        return this;
    }

    with(...opts: OpOption[]): State {
        if (!this.head) throw new Error("No head node found")
        this.head.data.op = opts.reduce((op, opt) => opt(op), this.head.data.op);
        return this;
    }

    branch(node?: StateNode): State {
        this.head = node;
        return this;
    }

    parallel(...ops: StateOp[]): StateNode[] {
        const originalHead = this.head;
        const resultNodes = ops.map(op => this.executeAndReturn(op));
        this.head = originalHead;
        return resultNodes;
    }

    nested(other: State): State {
        const def = Buffer.from(toBinary(DefinitionSchema, other.output().toDefinition())).toString('base64');
        const mnt = this.add(new StateNode([], mkFile(`/${LLBDefinitionFilename}`, def)))
        const parents = this.head ? [mnt.head!.id, this.head.id] : [mnt.head!.id];
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

    author(author: string): State {
        this.metadata.author = author;
        return this;
    }

    labels(labels: Map<string, string>): State {
        labels.forEach((value, key) => this.metadata.labels.set(key, value));
        return this;
    }

    toConfig(node?: StateNode): string {
        const def = this.output(node).toBase64Definition();
        const imageConfig: OCIImage = {
            created: new Date(0),
            author: this.metadata.author,
            config: {
                Cmd: this.metadata.command,
                Entrypoint: this.metadata.entrypoint,
                Env: Array.from(this.metadata.env.entries()).map(([key, value]) => `${key}=${value}`),
                WorkingDir: this.metadata.cwd,
                Labels: Object.fromEntries(this.metadata.labels.entries()),
            },
        }
        return `#syntax=${this.builder}:${this.builderVersion}\n${JSON.stringify({
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

    env(key: string, value: string): State {
        this.metadata.env.set(key, value);
        return this;
    }

    add(node: StateNode, setHead: boolean = true): State {
        this.g.add(node);
        if (setHead) this.head = node;
        return this;
    }

    workdir(path: string): State {
        this.metadata.cwd = path;
        const parents = new Set<string>()
        if (this.head) parents.add(this.head.id);
        this.add(new StateNode(Array.from(parents), workdir(path)))
        return this;
    }

    run(command: string): State {
        const parents = new Set<string>()
        if (this.head) parents.add(this.head.id);
        this.add(new StateNode(Array.from(parents), run(command, this.metadata.env, this.metadata.cwd)));
        return this;
    }

    script(script: string[] | string): State {
        if (typeof script === "string") script = [script];
        script = script.map(s => s.trim().replace(/\t/g, " "));
        const mkFileOp = mkFile("/EOF", Buffer.from(script.join("\n")).toString("base64"));
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

    merge(inputs: StateNode[]): State {
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

    do(op: StateOp): State {
        return op(this);
    }

    diff(op: StateOp): State {
        const lower = this.head;
        const upper = op(this).head;
        if (!lower || !upper) throw new Error("Expected two nodes to diff")
        this.add(diff(lower, upper))
        return this;
    }

    copy(src: string[] | string, dest: string, from?: StateNode): State {
        if (typeof src === "string") src = [src];
        const parents = new Set<string>()
        if (this.head) parents.add(this.head.id);
        if (!from) {
            const ctx = this.updateContext(src);
            parents.add(ctx.id);
        } else {
            parents.add(from.id);
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

/**
 * A function that takes a State instance and returns a new State instance.
 * Use this type to define higher-level operations that can be applied to a State instance.
 * @param state - The State instance to apply the operation to.
 * @returns The resulting State instance.
 * @example
 * const apkInstall = (pkg: string) => (s: State) => s.run(`apk add ${pkg}`)
 * state.do(apkInstall("git"))
 */
export type StateOp = (state: State) => State;

