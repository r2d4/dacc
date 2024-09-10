import { cacheMount } from "../dacc/patterns/patterns";
import { State } from "../dacc/state/state";
import { IState } from "../dacc/state/types";

async function main() {
    const root = new State()
    // We start from the alpine:3.20 base image
    // current returns a pointer to the node at the head of the DAG
    // this is useful for creating explicit edges between nodes
    // we will use this to do the equivalent of "multi-stage" builds
    // and later to do COPY --from
    const base = (await root.from("alpine:3.20")).current

    const workdir = "/app"
    const apkCache = "/var/cache/apk"
    const protocVersion = "28.0"
    const platform = "linux-aarch_64"

    // A helper function to install multiple packages in parallel
    const installPkgs = (cmd: string, pkgs: string[]) => (s: IState): IState =>
        s.merge(s.parallel(
            ...pkgs.map(pkg =>
                (s: IState) => s.run(`${cmd} ${pkg}`).with(cacheMount(apkCache))
            )
        ))

    const downloadProtoc =
        root.branch(base)
            // installs what we need to download and unzip the protoc binary in parallel
            .do(installPkgs("apk add", ["curl", "unzip"]))
            // downloads and unzips the protoc binary
            // diff captures the changes in the filesystem
            // so the resulting layer is only the unzipped files
            .diff(
                // script is a helper to run multiple commands in a single layer
                // instead of doing complicated command chaining
                s => s.script([
                    `curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v${protocVersion}/protoc-${protocVersion}-${platform}.zip`,
                    `unzip protoc-${protocVersion}-${platform}.zip -d /usr/local`
                ])
            ).current

    const downloadBuildkit =
        // We branch from the base image, similar to a 'FROM alpine as download-buildkit'
        root.branch(base)
            .workdir(workdir)
            .do(installPkgs("apk add", ["git"]))
            .script([
                `git clone --depth 1 https://github.com/moby/buildkit.git ${workdir}/github.com/moby/buildkit`,
                `mv ${workdir}/github.com/moby/buildkit/vendor /vendor`
            ]).current

    const protoOut =
        root.branch(base)
            .merge(root.parallel(
                // running four commands in parallel and merging the results
                s => s.do(s =>
                    // this parallel step contains two child steps -- first to install nodejs/npm, 
                    // and second to install ts-proto and protoc-gen-es
                    s
                        .do(installPkgs("apk add", ["nodejs", "npm"]))
                        .do(installPkgs("npm install -g", ["ts-proto", "@bufbuild/protoc-gen-es"]))
                ),
                // since the downloadProtoc step is a diff'd layer
                // and only contains the diff'd files, we can just copy / /
                s => s.copy("/", "/", downloadProtoc),
                // copies the buildkit source and vendor directory in two separate steps,
                // for a little extra caching (e.g., if the vendor directory doesn't change)
                s => s.copy(workdir, workdir, downloadBuildkit),
                s => s.copy("/vendor", "/vendor", downloadBuildkit),
            ))
            .diff(
                // another diff layer, this time to run the protoc command
                // the output files will be in /generated, which we'll copy out
                // so the resulting layer will only be the /generated folder
                s => s.script([
                    `set -e`,
                    `mkdir -p /generated`,
                    `protoc ${[
                        `-I${workdir}/ -I/vendor`,
                        `--es_out=/generated`,
                        `--es_opt=target=ts`,
                        `--es_opt=json_types=true`,
                        `$(find ${workdir}/github.com/moby/buildkit -name "ops.proto" -print)`,
                        `github.com/gogo/protobuf/gogoproto/gogo.proto`
                    ].join(" ")}`,
                ])
            ).current

    root.image.build({
        ref: protoOut,
        // we copy the final layer to the host
        // since the final layer is only a /generated folder, 
        // this creates src/generated on the host
        tag: ["df-generated"],
        output: ["src"]
    })
}

void main();