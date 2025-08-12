import type {NodeData, EdgeData, Pair } from "../types.ts"
import { createAdjList } from "./createAdjList.js"

export function BellmanFord_main(sourceNode: number, nodeList: NodeData[], edgeList: EdgeData[], isDirected : boolean) {
    const adjList: Record<number, Pair[]> = createAdjList(nodeList, edgeList, isDirected);
    const V = nodeList.length;
    const dist: Record<number, number> = [];
    for (let i = 0; i < nodeList.length; i++) {
        const node = nodeList[i].label;
        dist[node] = Infinity;
    }
    dist[sourceNode] = 0;

    const edges: {u: number, v: number, w: number}[] = []

    //create edgelist from adj list (just labels)
    for (const u in adjList) {
        for (const [v, w] of adjList[u]) {
            edges.push({u: Number(u), v, w});
        }
    }

    //we iterate V - 1 times which ensures that all vertices get reached
    for (let i = 0; i < V - 1; i++) {
        for (const {u, v, w} of edges) {
            if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
            }
        }
    }

    //check which nodes decrease after all iterations
    const IsNegCycle: boolean[] = Array(V + 1).fill(false);
    for (const {u, v, w} of edges) {
        if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
            IsNegCycle[v] = true;
        }
    }

    //now we check which nodes are reachable from those above
    const nodes: number[] = [];
    for (let i = 1; i < V + 1; i++) {
        if (IsNegCycle[i]) nodes.push(i);
    }

    while (nodes.length != 0) {
        const node = nodes.pop();
        if (node == null) continue;
        if (adjList[node] == null) continue;
        if (dist[node] === -Infinity) continue;
        dist[node] = -Infinity;
        for (let i = 0; i < adjList[node].length; i++) {
            const neighbor = adjList[node][i][0];
            if (!IsNegCycle[neighbor]) {
                IsNegCycle[neighbor] = true;
                nodes.push(neighbor);
            }
        }
    }
    return dist;
}