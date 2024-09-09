import { State } from 'dacc'

async function main() {

    const baseImage = "alpine"

    // Create the first build image to merge
    const hello = (await new State().from(baseImage))
        .run("echo Hello, World! > /hello.txt")

    // Create the second build to merge
    const awesome = (await new State().from(baseImage))
        .run("echo dacc is awesome! > /dacc.txt")

    // The parent build that will invoke
    // both nested builds in parallel
    const output = await new State().from(baseImage)

    output.merge(
        output.parallel(
            state => state.nested(hello),
            state => state.nested(awesome),
        )
    )

    return output.image.run({
        run: { command: "cat", args: ["/hello.txt", "/dacc.txt"] },
    })
}

if (require.main === module) {
    (async () => await void main())()
}

export { main as nestedBuilds }
