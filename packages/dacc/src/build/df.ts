import { cacheMount } from "../dac/patterns/op";
import { State } from "../dac/state";

async function main() {
    const root = new State()
    const base = root.from("alpine:3.20",).current

    const workdir = "/app"
    const apkCache = "/var/cache/apk"
    const protocVersion = "28.0"
    const platform = "linux-aarch_64"

    const installPkgs = (cmd: string, pkgs: string[]) => (s: State): State =>
        s.merge(s.parallel(
            ...pkgs.map(pkg =>
                (s: State) => s.run(`${cmd} ${pkg}`).with(cacheMount(apkCache))
            )
        ))

    const downloadProtoc =
        root.branch(base)
            .do(installPkgs("apk add", ["curl", "unzip"]))
            .diff(
                s => s.script([
                    `curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v${protocVersion}/protoc-${protocVersion}-${platform}.zip`,
                    `unzip protoc-${protocVersion}-${platform}.zip -d /usr/local`
                ])
            ).current

    const downloadBuildkit =
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
                s => s.do(s =>
                    s
                        .do(installPkgs("apk add", ["nodejs", "npm"]))
                        .do(installPkgs("npm install -g", ["ts-proto", "@bufbuild/protoc-gen-es"]))
                ),
                s => s.copy("/", "/", downloadProtoc),
                s => s.copy(workdir, workdir, downloadBuildkit),
                s => s.copy("/vendor", "/vendor", downloadBuildkit),
            ))
            .diff(
                s => s.script([
                    `set -e`,
                    `mkdir -p ${workdir}/out/es`,
                    `protoc ${[
                        `-I${workdir}/ -I/vendor`,
                        `--es_out=${workdir}/out/es`,
                        `--es_opt=target=ts`,
                        `--es_opt=json_types=true`,
                        `$(find ${workdir}/github.com/moby/buildkit -name "ops.proto" -print)`,
                        `github.com/gogo/protobuf/gogoproto/gogo.proto`
                    ].join(" ")}`,
                ])
            ).current

    root.buildImage({
        node: protoOut,
        output: ["src/generated"]
    })
}

void main();