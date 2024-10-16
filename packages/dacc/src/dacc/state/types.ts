import { DockerRegistryClient } from "@dacc/oci";
import { PlatformJson } from '../../generated/github.com/moby/buildkit/solver/pb/ops_pb';
import { CommandOutput, DockerBuildOptions, DockerClient, DockerRunOptions } from "../docker/client";
import { BKNode, BKNodeData } from "../graph/bk";
import { GraphDotConfig } from "../graph/graph";
import { StateNode } from "./state";

/**
 * State provides a high-level API for building and running Docker images.
 * It maintains a directed acyclic graph (DAG) of build steps and operations.
 */
export type StateProps = {
    /**
     * The Docker build client to use for building images.
     * Defaults to a new DockerBuildClient instance.
     */
    client?: DockerClient;

    /**
     * The Docker registry client to use for pushing images.
     * Defaults to a new DockerRegistryClient instance.
     */
    registry?: DockerRegistryClient;

    /**
     * The platform to use for the build.
     * Defaults to the current platform.
     */
    platform?: PlatformJson;
};

/**
 * A reference to a checkpoint in the build graph.
 * The reference includes the node and metadata for the checkpoint.
 * Use this to create explicit references to specific nodes in the build graph.
 */
export type StateReference = {
    node?: StateNode;
    metadata: StateMetadata;
}

/**
 * Metadata for a State instance.
 * This metadata is used as context for certain operations (e.g., cwd and run)
 * Other metadata will be added to the final container image config
 */
export type StateMetadata = {
    cwd: string;
    env: Map<string, string>;

    labels: Map<string, string>;
    author?: string;

    command?: string[];
    entrypoint?: string[];
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
export type StateOp = (state: IState) => IState;

/**
 * StateData represents the data associated with a StateNode.
 */
export type StateData = BKNodeData;

/**
 * Mutates a BKNodeData instance and returns the mutated instance.
 * Use this type to define operations that can be applied to a BKNodeData instance.
 */
export type StateDataOp = (node?: StateData) => StateData;

/**
 * Interface representing the public API of the Image class.
 * This class is responsible for building Docker images and running Docker containers
 * based on a given state configuration.
 */
export interface IImage {
    /**
     * Builds a Docker image from the current state.
     * @param opts - Options for the Docker build process and state reference.
     * @returns A promise that resolves with the build output and the generated image tag.
     */
    build(opts?: DockerBuildOptions & { ref?: StateReference }): Promise<CommandOutput & { tag: string }>;

    /**
     * Builds an image (if necessary) and runs it as a Docker container.
     * @param opts - Options for both the build and run processes.
     * @returns A promise that resolves with the output of the run command.
     */
    run(opts?: {
        run?: DockerRunOptions,
        build?: DockerBuildOptions,
    }): Promise<CommandOutput>;
}

/**
 * State provides a high-level API for building and running Docker images.
 * It maintains a directed acyclic graph (DAG) of build steps and operations.
 */
export interface IState {

    /**
     * The Docker image instance associated with the current State.
     */
    image: IImage;

    /**
     * The current head node of the build graph.
     */
    current: StateReference | undefined;

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
    from(identifier: string, platform?: PlatformJson, opts?: {
        skipPull?: boolean;
    }): Promise<IState>;

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
     * Adds a new labels to the image configuration.
     * @param kv - The key-value pairs to add as labels.
     */
    label(kv: Record<string, string>): IState;

    /**
     * Creates a new branch in the build graph.
     * @param ref - The reference to branch from. If not provided, branches from the current head.
     * @returns The current State instance.
     */
    branch(ref?: StateReference): IState;

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
     * Sets the command for the image.
     * @param command 
     */
    cmd(command: string[]): IState;

    /**
     * Sets the entrypoint for the image.
     * @param entrypoint 
     */
    entrypoint(entrypoint: string[]): IState;

    /**
     * Sets the author for the image.
     */
    author(author: string): IState;

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
    copy(src: string[] | string, dest: string, from?: StateReference): IState;

    /**
    * Applies one or more operation options to the current head node.
    * @param opts - The operation options to apply.
    * @returns The current State instance.
    */
    with(...opts: StateDataOp[]): IState;
}
