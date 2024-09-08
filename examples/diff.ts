import { State } from 'dacc'

async function main() {
    const root = new State()

    root.from("alpine").diff(
        state => state.run("echo $(date) > /result.txt")
    )

    // This outputs the diff between the two images
    // which is the file /result.txt with the current date
    root.image.build({ output: ["."] })
}

void main()