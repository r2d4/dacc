# dacc: docker-as-code compiler

### _Cache-efficient, sandboxed, builds as code._

* <ins>Native</ins> support with any Docker installation, no extra tools needed
* <ins>Infrastructure-as-code</ins> for docker images
* <ins>Cache-efficient</ins>: Represent any build graph in dacc
* <ins>Extend</ins>: [__merge__](examples/merge.ts), [__diff__](examples/diff.ts), and [__nested builds__](examples/nested-builds.ts) operations

### Installation
__dacc__ requires [Docker](https://www.docker.com).
```
npm install dacc
```
### Getting Started - Hello World
Create a new project with the `create-dacc`, which will create a new TypeScript project and install dacc in the directory provided.
```
npx create-dacc hello-dacc
```
Enter the newly created directory and run the build
```
cd hello-dacc && npm run build
```

### Merging / Parallelism
Docker images often have to install packages via a package manager. This might be specified in a single command `RUN apk add git curl wget`. But when a new package is added, the entire cache is invalidated.

Instead, with dacc, you can install them in parallel and then merge the resulting filesystems.

```typescript main.ts
import { cacheMount, State } from 'dacc'

async function main() {
    const s = new State()

    const pkgs = ["git", "curl", "wget"]

    s.from("alpine").merge(
        s.parallel(
            ...pkgs.map(bin => (s: State) =>
                s.run(`apk add ${bin}`).with(cacheMount("/var/cache/apk")))
        ),
    )

    s.runImage({
        run: { command: "ls", args: pkgs.map(bin => `/usr/bin/${bin}`) },
    })
}

void main()
```
Running it for the first time takes 1.8s. 
```
[+] Building 1.8s (10/10) FINISHED  
...
 => [from] alpine                                                                                                 0.0s
 => [run] apk add wget                                                                                            1.4s
 => [run] apk add curl                                                                                            1.0s
 => [run] apk add git                                                                                             1.0s
 => [merge] [run] apk add git, [run] apk add curl, [run] apk add wget                                             0.2s
 ...
 ```
 Now add another package to the list
 ```
const bins = ["git", "curl", "wget"]

