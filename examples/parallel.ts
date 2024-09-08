import { cacheMount, State } from 'dacc'

async function main() {
    const s = new State()

    const bins = ["git", "curl", "wget", "jq"]

    s.from("alpine").merge(
        s.parallel(
            ...bins.map(bin => (s: State) =>
                s.run(`apk add ${bin}`).with(cacheMount("/var/cache/apk")))
        ),
    )

    s.image.run({
        run: { command: "ls", args: bins.map(bin => `/usr/bin/${bin}`) },
    })
}

void main()