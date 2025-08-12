import type { NodeData, EdgeData, Pair } from "../types.ts";
import { createAdjList } from "./createAdjList.ts";


//simple priority queue, fine for smaller graphs

interface IPriorityQueue<T> {
    push(item: T, priority: number): void;
    pop(): T | undefined;
    peek(): T | undefined;
    size(): number;
}

class PriorityQueue<T> implements IPriorityQueue<T> {
    private heap: {item: T, priority: number}[] = []
    private top = 0;

    push(item : T, priority: number): void {
        this.heap.push({item, priority});
        this.heap.sort((a, b) => a.priority - b.priority);
    }

    pop(): T | undefined {
        if (this.heap.length === 0) return undefined;
        return this.heap.shift()?.item;
    }

    peek(): T | undefined {
        if (this.heap.length === 0) return undefined
        return this.heap[this.top].item;
    }

    size(): number {
        return this.heap.length;
    }
}




export function Dijkstra_main(sourceNode: number, nodeList: NodeData[], edgeList: EdgeData[], isDirected: boolean) {
    const adjList: Record<number, Pair[]> = createAdjList(nodeList, edgeList, isDirected);
    const visited: Record<number, boolean> = [];
    const distances: Record<number, number> = [];

    //set up the distances map and visited map
    for (let i = 0; i < nodeList.length; i++) {
        const node = nodeList[i].label;
        distances[node] = Infinity;
        visited[node] = false;
    }
    distances[sourceNode] = 0;

    Dijkstra(sourceNode, adjList, visited, distances);
    return distances;
}

function Dijkstra(sourceNode: number, adjList: Record<number, Pair[]>, visited: Record<number, boolean>, distances: Record<number, number>) {
    const pq = new PriorityQueue<number>()
    pq.push(sourceNode, 0);

    while (pq.size() != 0) {
        const node = pq.pop();
        if (node == null) continue;
        if (adjList[node] == null) continue;
        const distance = distances[node];

        visited[node] = true;
        for (let i = 0; i < adjList[node].length; i++) {
            const neighbor = adjList[node][i][0];
            if (visited[neighbor]) continue;
            const weight = adjList[node][i][1];
            const newDistance = distance + weight;
            if (newDistance < distances[neighbor]) {
                distances[neighbor] = newDistance;
                pq.push(neighbor, newDistance);
            }
        }
    }
}