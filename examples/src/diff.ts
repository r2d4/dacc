import { State } from 'dacc'

async function main() {
    const base = await new State().from("alpine")

    base.diff(
        state => state.run("echo $(date) > /result.txt")
    )

    // This outputs the diff between the two images
    // which is the file /result.txt with the current date
    return base.image.build({ output: ["."] })
}

if (require.main === module) {
    await void main()
}

export { main as diff }
