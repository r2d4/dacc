interface Node {
    id: string;
    parents: string[];
}

class Graph<T extends Node> {
    private _nodes = new Map<string, T>();
    private _edges = new Map<string, Set<string>>();

    add(node: T): void {
        this._nodes.set(node.id, node);
        this._edges.set(node.id, new Set(node.parents));
    }

    update(id: string, newNode: T): void {
        if (!this._nodes.has(id)) throw new Error(`Node not found: ${id}`);
        this._nodes.set(id, newNode);
        this._edges.forEach(parents => {
            if (parents.has(id)) {
                parents.delete(id);
                parents.add(newNode.id);
            }
        });
    }

    copy(): Graph<T> {
        const g = new Graph<T>();
        this._nodes.forEach(node => g.add(node));
        return g;
    }

    toJSON(): any {
        return [...this._nodes.values()]
    }

    get nodes(): Map<string, T> {
        return this._nodes;
    }

    get edges(): Map<string, Set<string>> {
        return this._edges;
    }

    sort(): T[] {
        const visited = new Set<string>();
        const result: T[] = [];

        const dfs = (id: string, path = new Set<string>()): void => {
            if (path.has(id)) throw new Error(`Cycle detected: ${[...path, id].join(" -> ")}`);
            if (visited.has(id)) return;

            visited.add(id);
            path.add(id);

            this._edges.get(id)?.forEach(parentId => dfs(parentId, path));

            path.delete(id);
            result.push(this._nodes.get(id)!);
        };

        this._nodes.forEach((_, id) => !visited.has(id) && dfs(id));
        return result;
    }

    toDot(config: {
        nodeLabel?: (node: T) => string,
        nodeAttributes?: (node: T) => string,
        edgeAttributes?: (from: T, to: T) => string
    } = {}): string {
        const lines: string[] = ['digraph G {'];

        // Add nodes
        this._nodes.forEach((node, id) => {
            let nodeStr = `  "${escapeString(id)}"`;
            const labelParts: string[] = [];

            if (config.nodeLabel) {
                const label = escapeString(config.nodeLabel(node));
                labelParts.push(`label="${label}"`);
            }

            if (config.nodeAttributes) {
                const attrs = config.nodeAttributes(node);
                if (attrs) labelParts.push(attrs);
            }

            if (labelParts.length > 0) {
                nodeStr += ` [${labelParts.join(', ')}]`;
            }

            lines.push(`${nodeStr};`);
        });

        // Add edges
        this._edges.forEach((parents, id) => {
            const toNode = this._nodes.get(id)!;
            parents.forEach(parentId => {
                const fromNode = this._nodes.get(parentId)!;
                let edgeStr = `  "${escapeString(parentId)}" -> "${escapeString(id)}"`;

                if (config.edgeAttributes) {
                    const attrs = config.edgeAttributes(fromNode, toNode);
                    if (attrs) edgeStr += ` [${attrs}]`;
                }

                lines.push(`${edgeStr};`);
            });
        });

        lines.push('}');
        return lines.join('\n');
    }
}

function escapeString(str: string): string {
    // Replace newlines with \n, and escape quotes and backslashes
    return str.replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n');
}

export type GraphDotConfig<T extends Node> = {
    nodeLabel?: (node: T) => string,
    nodeAttributes?: (node: T) => string,
    edgeAttributes?: (from: T, to: T) => string
};


export { Graph, Node };
