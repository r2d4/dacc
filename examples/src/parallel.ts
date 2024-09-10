import { cacheMount, IState, State } from 'dacc'

async function main() {
    const s = (await new State().from("alpine"))

    const bins = ["git", "curl", "wget", "jq"]

    s.merge(
        s.parallel(
            ...bins.map(bin => (s: IState) =>
                s.run(`apk add ${bin}`).with(cacheMount("/var/cache/apk")))
        ),
    )

    return s.image.run({
        run: { command: "ls", args: bins.map(bin => `/usr/bin/${bin}`) },
    })
}

if (require.main === module) {
    (async () => await void main())()
}

export { main as parallel }
