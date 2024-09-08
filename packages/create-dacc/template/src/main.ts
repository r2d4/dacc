import { State } from "dacc"

async function main() {

    // State contains the directed acyclic graph (DAG) of build steps
    const state = new State()

    // FROM is usually the first step in a build
    // It sets the base image for subsequent build steps
    // This is equivalent to a FROM command in a Dockerfile
    state.from("alpine")

    // State keeps track of the last step in the DAG
    // This makes it easy to chain build steps
    // This is equivalent to a RUN command in a Dockerfile
    state.run("echo Hello, World! > /hello.txt")

    // State also contains helper methods for building and running images
    // This is equivalent to a docker run command
    state.image.run({ run: { command: "cat", args: ["/hello.txt"] } })
}

void main()