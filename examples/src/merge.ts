import { cacheMount, State } from 'dacc'

async function main() {
    const root = await (new State().from("alpine"))

    const addRepos = [
        "@testing http://dl-cdn.alpinelinux.org/alpine/edge/testing",
    ].map(repo => `echo "${repo}" >> /etc/apk/repositories`)

    const apkCache = "/var/cache/apk"
    const installPkgs = (cmd: string, pkgs: string[]) => (s: State): State =>
        s.merge(s.parallel(
            ...pkgs.map(pkg =>
                (s: State) => s.run(`${cmd} ${pkg}`).with(cacheMount(apkCache))
            )
        ))

    /**
     * First, we add add the repositories we need and update the package list.
     * Then, we install cowsay and fortune in parallel and merge the resulting filesystems.
     */
    root.script([...addRepos, "apk update"])
        .do(installPkgs("apk add", ["cowsay@testing", "fortune"]))

    return root.image.run({
        run: { command: "/bin/sh", args: ["-c", "fortune | cowsay"] },
    })
}

if (require.main === module) {
    await void main()
}

export { main as merge }
