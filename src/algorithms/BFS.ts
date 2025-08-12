import type {NodeData, EdgeData, Pair} from "../types.ts";
import {createAdjList} from "./createAdjList.ts";


//queue implementation from https://dev.to/glebirovich/typescript-data-structures-stack-and-queue-hld

interface IQueue<T> {
    enqueue(item: T): void;
    dequeue(): T | undefined;
    size(): number;
}

class Queue<T> implements IQueue<T> {
    private storage: T[] = [];
    private capacity: number;
  
    constructor(capacity: number = Infinity) {
      this.capacity = capacity;
    }
  
    enqueue(item: T): void {
      if (this.size() === this.capacity) {
        throw Error("Queue has reached max capacity, you cannot add more items");
      }
      this.storage.push(item);
    }
    dequeue(): T | undefined {
      return this.storage.shift();
    }
    size(): number {
      return this.storage.length;
    }
}


export function BFS_main(nodeList: NodeData[], edgeList: EdgeData[], isDirected: boolean, startNode: number) {
    const adjList: Record<number, Pair[]> = createAdjList(nodeList, edgeList, isDirected);
    const path: Pair[] = [];
    console.log(adjList);
    const visited: Record<number, boolean> = {};
    BFS(adjList, startNode, visited, path);
    return path;
}


function BFS (adjList: Record<number, Pair[]>, startNode: number, visited: Record<number, boolean>, path: Pair[]) {
  const queue = new Queue<number>();
  queue.enqueue(startNode);
  visited[startNode] = true;

  while (queue.size() != 0) {
    const node = queue.dequeue();
    if (node == null) break;
    if (adjList[node] == null) continue;
    console.log(node);
    for (let i = 0; i < adjList[node].length; i++) {
      const neighbor = adjList[node][i][0];
      if (!visited[neighbor]) {
        visited[neighbor] = true;
        path.push([node, neighbor]);
        queue.enqueue(neighbor);
      }
    }
  }
}  
