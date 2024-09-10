import { cacheMount, createFile, PlatformJson, State } from 'dacc'

const goMain = `package main

import (
	"fmt"
	"runtime"
)

func main() {
	fmt.Printf("%s/%s\\n", runtime.GOOS, runtime.GOARCH)
}
 `

async function forPlatform(platform: PlatformJson) {
    const root = await (new State().from("golang:1.23-alpine", platform))
    root.do(createFile("/main.go", goMain))
    root.run("go build -o /main /main.go").with(cacheMount("/go/pkg"))
    const { stdout } = await root.image.run({
        build: { quiet: true },
        run: { command: "go", args: ["run", "/main.go"], quiet: true },
    })
    return { platform, stdout }
}
async function main() {
    const platforms: PlatformJson[] = [
        { OS: "linux", Architecture: "amd64" },
        { OS: "linux", Architecture: "arm64" },
        { OS: "linux", Architecture: "arm", Variant: "v6" },
        { OS: "linux", Architecture: "arm", Variant: "v7" },
        { OS: "linux", Architecture: "386" },
        { OS: "linux", Architecture: "ppc64le" },
        { OS: "linux", Architecture: "s390x" },
        { OS: "linux", Architecture: "riscv64" },
    ]
    const results = await Promise.all(platforms.map(forPlatform))
    console.log(results.map((r) => JSON.stringify(r)).join("\n"))
}

if (require.main === module) {
    (async () => await void main())()
}

export { main as merge }
