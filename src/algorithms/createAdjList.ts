import type { NodeData, EdgeData } from "../types"

export function createAdjList(nodeList: NodeData[], edgeList: EdgeData[], isDirected: boolean): Record<number, number[]> {
    const adjList: Record<number, number[]> = {};

    for (let i = 0; i < edgeList.length; i++) {
        let startID = edgeList[i].startID;
        let endID = edgeList[i].endID;
        let startLabel = -1;
        let endLabel= -1;

        //find the labels of the start and ending nodes
        for (let i = 0; i < nodeList.length; i++) {
            if (nodeList[i].id == startID)startLabel = nodeList[i].label;
            if (nodeList[i].id == endID)endLabel = nodeList[i].label;
        }

        //Always add the path from start -> end node;
        if (!adjList[startLabel]) adjList[startLabel] = [];
        adjList[startLabel].push(endLabel);
        
        //if the graph isn't directed, the reverse path also exists
        if (!isDirected) {
            if (!adjList[endLabel]) adjList[endLabel] = [];
            adjList[endLabel].push(startLabel);
        }
    }
    for (const key in adjList) {
        adjList[key].sort((a, b) => a - b);
    }
    return adjList;
}