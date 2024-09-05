import { cacheMount, State } from 'dacc'

async function main() {
    const root = new State()
    /**
     * This example demonstrates how to run multiple commands in parallel.
     * It installs git, curl, and wget in parallel and runs three sleep commands (for demonstration purposes) in parallel.
     * Then it merges the states and runs a cat command to output the contents of the file /result.txt.
     * The output is the number 4 because the last sleep command writes the number 4 to the file.
     * 
     * An illustration of the build DAG:
     * -> from alpine:3.20
     * -> merge install binaries and sleep commands
     *   -> install binaries
     *      -> git
     *      -> curl
     *      -> wget
     *   -> run sleep commands in parallel
     *      -> sleep 2
     *      -> sleep 3
     *      -> sleep 4
     */
    root
        .from("alpine")
        .merge(root.parallel(
            state => state.merge(state.parallel(
                ...["git", "curl", "wget"].map(tool => (state: State) => state.run(`apk add ${tool}`).with(cacheMount("/var/cache/apk")) as State)
            )),
            state => state.merge(state.parallel(
                state => state.run("sleep 2 && echo 2 > /result.txt"),
                state => state.run("sleep 3 && echo 3 > /result.txt"),
                state => state.run("sleep 4 && echo 4 > /result.txt"),
            )),
        ))

    root.runImage({
        build: { noCache: true },
        run: { command: "cat", args: ["/result.txt"] },
    })
}

void main()