import type {NodeData, EdgeData, Pair} from "../types.ts";
import {createAdjList} from "./createAdjList.ts";


export function DFS_main(nodeList: NodeData[], edgeList: EdgeData[], isDirected: boolean, startNode: number) {
    const adjList: Record<number, Pair[]> = createAdjList(nodeList, edgeList, isDirected);
    const visited: Record<number, boolean> = {};
    const path: Pair[] = [];
    DFS(startNode, visited, adjList, path);
    return path;
}

function DFS(node: number, visited: Record<number, boolean>, adjList: Record<number, Pair[]>, path: Pair[]) {
    visited[node] = true;
    const neighbors = adjList[node] || [];
    for (let i = 0; i < neighbors.length; i++) {
        if (!visited[neighbors[i][0]]) {
            path.push([node, neighbors[i][0]]);
            DFS(neighbors[i][0], visited, adjList, path);
        }
    }
}
