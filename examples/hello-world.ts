import { State } from 'dacc'

async function main() {
    new State().from("alpine")
        .run("echo Hello, World! > /hello.txt")
        .runImage({ run: { command: "cat", args: ["/hello.txt"] } })
}

void main()