export interface NodeData {
    id: number;
    label: number;
    x: number;
    y: number;
    size: number;
  }
  
export interface EdgeData {
    id: number;
    weight: number;
    startID: number;
    endID: number;
  }
  
export type groupedEdge = {
    edge: EdgeData;
    index: number;
    total: number;
  }

export type Pair = [number, number];