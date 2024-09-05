import { State } from 'dacc'

async function main() {

    const baseImage = "alpine"

    // Create the first build image to merge
    const hello = new State()
        .from(baseImage)
        .run("echo Hello, World! > /hello.txt")

    // Create the second build to merge
    const awesome = new State()
        .from(baseImage)
        .run("echo dacc is awesome! > /dacc.txt")

    // The parent build that will invoke
    // both nested builds in parallel
    const output = new State().from(baseImage)

    output.merge(
        output.parallel(
            state => state.nested(hello),
            state => state.nested(awesome),
        )
    )

    output.runImage({
        run: { command: "cat", args: ["/hello.txt", "/dacc.txt"] },
    })
}

void main()