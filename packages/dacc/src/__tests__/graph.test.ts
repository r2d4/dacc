import { describe, expect, test } from '@jest/globals';
import { Graph } from '../dac/graph/graph';

interface TestNode {
    id: string;
    parents: string[];
    value?: string;
}

describe('Graph', () => {
    test('should add and retrieve nodes', () => {
        const graph = new Graph<TestNode>();
        const node: TestNode = { id: '1', parents: [] };
        graph.add(node);
        expect(graph.nodes.get('1')).toEqual(node);
    });

    test('should update nodes', () => {
        const graph = new Graph<TestNode>();
        const node: TestNode = { id: '1', parents: [], value: 'test' };
        graph.add(node);
        const updatedNode: TestNode = { id: '1', parents: [], value: "updated" };
        graph.update('1', updatedNode);
        expect(graph.nodes.get('1')).toEqual(updatedNode);
    });

    test('should throw error when updating non-existent node', () => {
        const graph = new Graph<TestNode>();
        const node: TestNode = { id: '1', parents: [] };
        expect(() => graph.update('1', node)).toThrow('Node not found: 1');
    });

    test('should perform topological sort on acyclic graph', () => {
        const graph = new Graph<TestNode>();
        graph.add({ id: '1', parents: [] });
        graph.add({ id: '3', parents: ['2'] });
        graph.add({ id: '4', parents: ['3', '1'] });
        graph.add({ id: '2', parents: ['1'] });
        graph.add({ id: '5', parents: ['4', '3'] });

        const sorted = graph.sort();
        expect(sorted.map(n => n.id)).toEqual(['1', '2', '3', '4', '5']);
    });

    test('should detect cycles in graph', () => {
        const graph = new Graph<TestNode>();
        graph.add({ id: '1', parents: ['3'] });
        graph.add({ id: '2', parents: ['1'] });
        graph.add({ id: '3', parents: ['2'] });

        expect(() => graph.sort()).toThrow(/Cycle detected:/);
    });

    test('should handle empty graph', () => {
        const graph = new Graph<TestNode>();
        expect(graph.sort()).toEqual([]);
    });

    test('should handle graph with single node', () => {
        const graph = new Graph<TestNode>();
        const node: TestNode = { id: '1', parents: [], value: "1" };
        graph.add(node);
        expect(graph.sort()).toEqual([node]);
    });

    test('should handle graph with multiple independent nodes', () => {
        const graph = new Graph<TestNode>();
        const node1: TestNode = { id: '1', parents: [] };
        const node2: TestNode = { id: '2', parents: [] };
        graph.add(node1);
        graph.add(node2);
        const sorted = graph.sort();
        expect(sorted).toHaveLength(2);
        expect(sorted).toContain(node1);
        expect(sorted).toContain(node2);
    });
});