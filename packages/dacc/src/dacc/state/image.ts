import { Digest } from "@dacc/common";
import { CommandOutput, DockerBuildOptions, DockerClient, DockerRunOptions } from "../docker/client";
import { State, StateNode } from "./state";
import { StateReference } from "./types";

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
    async build(opts: DockerBuildOptions & { ref?: StateReference } = {}): Promise<CommandOutput & { tag: string }> {
        const tag = this.tag(opts.ref?.node)
        opts.tag = opts.tag || []
        opts.tag.push(tag)

        return new Promise(
            resolve => this.client.build(this.state.toConfig(opts.ref?.node), opts.contextPath, opts)
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