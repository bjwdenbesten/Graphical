import GraphMenu from "./GraphMenu";
import Node from "./Node";
import Edge from "./Edge";
import { useState, useEffect, useCallback, useRef } from "react";
import type {NodeData, EdgeData, groupedEdge, Pair} from "../types.ts";

import { DFS_main } from "../algorithms/DFS";
import { BFS_main } from "../algorithms/BFS";
import { Dijkstra_main } from "../algorithms/Dijkstra.ts";
import { BellmanFord_main } from "../algorithms/BellmanFord.ts";


let node_id = 0;
let edge_id = 0;

const groupEdges = (edges: EdgeData[]) : groupedEdge[] => {
  const map = new Map<string, EdgeData[]>();

  for (const edge of edges) {
    const minID = Math.min(edge.startID, edge.endID);
    const maxID = Math.max(edge.startID, edge.endID);
    const key = `${minID}-${maxID}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(edge);
  }

  const res: groupedEdge[] = [];
  for (const group of map.values()) {
    group.forEach((edge, i) => {
      res.push({edge, index: i, total: group.length});
    })
  }
  return res;
}


const Graph = () => {
  const [keyBinds, setKeyBinds] = useState({
    Create_Node: "n",
    Delete: "d",
  });

  const [overWorkspace, setoverWorkspace] = useState(false);

  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 20, y: 20 });
  const [nodeSize, setNodeSize] = useState(60);
  const [dragNodeID, setdragNodeID] = useState<number | null> (null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}> ({x: 0, y: 0});
  const[showNodeLabels, setShoeNodeLabels] = useState(true);
  const [showNodeIDS, setShowNodeIDS] = useState(false);
  const [nodeHovered, setNodeHovered] = useState<number | null> (null);

  //edge states
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [groupedEdges, setGroupedEdges] = useState<groupedEdge[]>([]);
  const [startNode, setStartNode] = useState<NodeData | null> (null);
  const [endNode, setEndNode] = useState<NodeData | null> (null);
  const [edgeHovered, setEdgeHovered] = useState<number | null> (null);

  //weight states
  const [weightSize, setWeightSize] = useState<number> (25);

  //menu
  const [outputString, setOutputString] = useState<string> ("");

  //animation stuff
  const [showDistance, setShowDistance] = useState<boolean> (false);



  const mouseRef = useRef(mousePosition);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef(nodeHovered);
  const edgeRef = useRef(edgeHovered);

  //graph states
  const [isWeighted, setIsWeighted] = useState(false);
  const [isDirected, setIsDirected] = useState(false);

  //algorithm handling

  const find_IDS = (path: Pair[], weights: undefined | number[]) => {
    const node_ids: Pair[] = [];
    const edge_ids: number[] = [];
    for (let i = 0; i < path.length; i++) {
      let begin_id = -1;
      let end_id = -1;
      let weight = -1;
      if (weights !== undefined) {
        weight = weights[i];
      }
      for (let j = 0; j < nodes.length; j++) {
        if (path[i][0] === nodes[j].label) {
          begin_id = nodes[j].id;
        }
        if (path[i][1] === nodes[j].label) {
          end_id = nodes[j].id;
        }
      }
      node_ids.push([begin_id, end_id] as Pair);
      let node_id = -1;
      for (let k = 0; k < edges.length; k++) {
        if (isDirected) {
          if (edges[k].startID === begin_id && edges[k].endID === end_id) {
            if (weights !== undefined) {
              if (edges[k].weight === weight) {
                node_id = edges[k].id;
              }
            }
            else {
              node_id = edges[k].id;
            }
          }
        }
        else {
          if ((edges[k].startID === begin_id && edges[k].endID === end_id) || (edges[k].startID === end_id && edges[k].endID === begin_id)) {
            if (weights !== undefined) {
              if (edges[k].weight === weight) {
                node_id = edges[k].id;
              }
            }
            else {
              node_id = edges[k].id;
            }
          }
        }
      }
      edge_ids.push(node_id);
    }
    return [node_ids, edge_ids];
  }


  const DFS = async(startingNode: number) => {
    const path = DFS_main(nodes, edges, isDirected, startingNode);
    const [nodePairs, edgeIDS] = find_IDS(path, undefined) as[Pair[], number[]];
    console.log(nodePairs);
    setOutputString(convert_output("DFS", path));
    await animatePath(nodePairs, edgeIDS);
  }

  const animatePath = async(nodePairs: Pair[], edgeIDS: number[]) => {
    for (let i = 0; i < nodePairs.length; i++) {
      const [startID, endID] = nodePairs[i];
      const edgeID = edgeIDS[i];
      highlightNode(startID, true);
      if (i == 0) {
        await new Promise(res => setTimeout(res, 1000));
      }
      highlightNode(endID, true);
      highlightEdge(edgeID, true);
      await new Promise(res => setTimeout(res, 1000));
    }
    for (let i = 0; i < nodePairs.length; i++) {
      const [startID, endID] = nodePairs[i];
      const edgeID = edgeIDS[i];
      highlightNode(startID, false);
      highlightNode(endID, false);
      highlightEdge(edgeID, false);
    }
  }

  const BFS = async(startingNode: number) => {
    const path = BFS_main(nodes, edges, isDirected, startingNode);
    const [nodePairs, edgeIDS] = find_IDS(path, undefined) as[Pair[], number[]];
    setOutputString(convert_output("BFS", path));
    await animatePath(nodePairs, edgeIDS);
  }

  const convert_output = (type: string, pairs: Pair[]) => {
    let ret_string = type + " Path:\nTotal Steps: ";
    ret_string += pairs.length + "\n";
    for (let i = 0; i < pairs.length; i++) {
      ret_string += "Node " + pairs[i][0] + " to Node " + pairs[i][1];
      if (i != pairs.length - 1) {
        ret_string += '\n';
      }
    }
    return ret_string;
  }

  const Dijkstras = async(sourceNode: number) => {
    const [distances, pairs, weights, state] = Dijkstra_main(sourceNode, nodes, edges, isDirected) as [Record<number, number>, Pair[], number[], Pair[]];
    const [nodePairs, edgeIDS] = find_IDS(pairs, weights) as [Pair[], number[]];
    setOutputString(convert_distances("Dijkstra", distances));
    await animateDijkstra(sourceNode, nodePairs, edgeIDS, state);
  }

  const animateDijkstra = async(sourceNode: number, nodePairs : Pair[], edgeIDS: number[], state: Pair[]) => {
    setShowDistance(true);
    changeDistance(sourceNode, 0);

    for (let i = 0; i < nodePairs.length; i++) {
      const startNode = nodePairs[i][0];
      const endNode = nodePairs[i][1];
      const edge = edgeIDS[i];
      const [node, change] = state[i];

      highlightNode(startNode, true);
      await new Promise(res => setTimeout(res, 1000));
      highlightEdge(edge, true);

      await new Promise(res => setTimeout(res, 1000));

      if (node !== -1) {
        changeDistance(node, change);
        await new Promise(res => setTimeout(res, 1000));
      }
    }

    await new Promise(res => setTimeout(res, 3000));

    setShowDistance(false);
    for(let i = 0; i < nodes.length; i++) {
      changeDistance(nodes[i].label, Infinity);
    }
    for (let i = 0; i < nodePairs.length; i++) {
      highlightNode(nodePairs[i][0], false);
      highlightNode(nodePairs[i][1], false);
    }
    for (let i = 0; i < edgeIDS.length; i++) {
      highlightEdge(edgeIDS[i], false);
    }
  }

  const BellmanFord =  (sourceNode: number) => {
    const distances = BellmanFord_main(sourceNode, nodes, edges, isDirected);
    setOutputString(convert_distances("Bellman-Ford", distances));
  }

  const convert_distances = (type: string, distances: Record<number, number>) => {
    const size = Object.keys(distances).length;
    let ret_string = type + " Output\n";
    ret_string += "Total Nodes: " + size + "\n";
    ret_string += "(Node : Distance)\n"

    let count = 0;

    for (const [node, distance] of Object.entries(distances)) {
      ret_string += node + " : " + distance;
      if (count != size - 1) ret_string += "\n";
      count++;
    }
    return ret_string;
  }

  const highlightNode = (id: number, value: boolean) => {
    setNodes(prev => 
      prev.map(node =>
        node.id === id ? {...node, highlighted: value} : node
      )
    );
  }

  const highlightEdge = (id: number, value: boolean) => {
    setEdges(prev => 
      prev.map(edge =>
          edge.id === id ? {...edge, highlighted: value} : edge
      )
    );
  }

  const changeDistance = (label: number, newDistance: number) => {
    setNodes(prev =>
      prev.map(node =>
          node.label === label ? {...node, distance: newDistance} : node
        )
      );
  }



  const changeWeight = (id: number, newWeight: number) => {
    setEdges(prev =>
      prev.map(edge => edge.id === id ? {...edge, weight: newWeight} : edge)
    );
  }

  //make sure it stays updated
  useEffect(() => {
    mouseRef.current = mousePosition;
  }, [mousePosition]);

  useEffect(() => {
    nodeRef.current = nodeHovered;
  }, [nodeHovered]);

  useEffect(() => {
    edgeRef.current = edgeHovered;
  }, [edgeHovered])

  useEffect(() => {
    if (startNode && endNode) {
      createEdge();
      console.log("startingNodeID: " + startNode.id);
      console.log("endingNodeID: " + endNode.id);
      setStartNode(null);
      setEndNode(null);
      console.log("Created Edge");
    }
  }, [startNode, endNode, setEdges]);

  useEffect(() => {
    setGroupedEdges(groupEdges(edges));
  }, [edges]);


  const createEdge = useCallback(() => {
    if (!startNode || !endNode) return;
    setEdges((prev) => [
      ...prev,
      {
        id: edge_id,
        weight: 0,
        startID: startNode.id,
        endID: endNode.id,
        highlighted: false
      },
    ]);
    edge_id++;
  }, [startNode, endNode]);

  useEffect(() => {
    const selectFirstNode = (e: MouseEvent) => {
      if (nodeHovered == null || e.button !== 2) return;
      nodes.map((node) => {
        node.id === nodeHovered ? setStartNode(node) : null
      })
      console.log("Set Start Node");
    }

    const selectSecondNode = (e: MouseEvent) => {
      if (nodeHovered == null || startNode === null || e.button !== 2) {
        setStartNode(null);
        return;
      }
      if (nodeHovered === startNode.id) return;
      nodes.map((node) => {
        node.id === nodeHovered ? setEndNode(node) : null
      })
      console.log("Set End Node");
    }

    window.addEventListener("mousedown", selectFirstNode);
    window.addEventListener("mouseup", selectSecondNode);
    return() => {window.removeEventListener("mousedown", selectFirstNode), window.removeEventListener("mouseup", selectSecondNode)}
  }, [nodeHovered, nodes, startNode]);



  //updates the node list with new node
  const createNode = useCallback(() => {
    const {x, y} = mouseRef.current;
    setNodes((prev) => [
      ...prev,
      {
        id: node_id,
        label: prev.length + 1,
        x: x,
        y: y,
        size: nodeSize,
        distance: Infinity,
        highlighted: false
      },
    ]);
    node_id++;
  }, [mousePosition, nodes, nodeSize]);




  //deletes a component
  const deleteComponent = useCallback(() => {
    const nodeHovered = nodeRef.current;
    const edgeHovered = edgeRef.current;
    console.log("Deleting component!");
    if (nodeHovered !== null) {
      setNodes((prev) => {
        const filtered = prev.filter((node)=>node.id !== nodeHovered);
        const relabeled = filtered.map((node, index) => ({
          ...node,
          label: index + 1,
        }));
        return relabeled;
      }
      );
      setEdges((prev) => {
        const filtered = prev.filter((edge) => edge.startID !== nodeHovered && edge.endID !== nodeHovered);
        return filtered;
      })

      setEdgeHovered(null);
    }
    if (edgeHovered !== null) {
      console.log("Deleting edge");
      setEdges((prev) => {
        const filter = prev.filter((edge) => edge.id !== edgeHovered);
        return filter;
      })
      setEdgeHovered(null);
    }
  }, [nodeHovered, setNodes, edgeHovered, setEdges]);

  //clears all components from workspace
  const clearComponents = useCallback(() => {
    setNodes([]);
    setEdges([]);
    node_id = 0;
    edge_id = 0;
  }, [setNodes, setEdges]);

  const clearWeights = useCallback(() => {
    setEdges((edge) => 
      edge.map((edge) => ({
        ...edge,
        weight: 0,
      }))
    )
  }, [edges, setEdges])


  //updates the mouse position
  useEffect(() => {
    const updateMouse = (e: MouseEvent) => {
      if (e.clientX > 0 && e.clientY > 0) {
      setMousePosition({ x: e.clientX, y: e.clientY });
      }
    };

    window.addEventListener("mousemove", updateMouse);

    return () => {
      window.removeEventListener("mousemove", updateMouse);
    };
  }, [mousePosition]);


  //checks if we are over the workspace, then check for keybinds
  useEffect(() => {
    if (!overWorkspace) return;

    const handleInput = (e: KeyboardEvent) => {
      const keyPressed = e.key;

      const map: { [key: string]: () => void } = {
        [keyBinds.Create_Node]: createNode,
        [keyBinds.Delete] : deleteComponent,
      };

      const action = map[keyPressed];
      if (action) {
        e.preventDefault();
        action();
      }
    };

    window.addEventListener("keydown", handleInput);
    return () => window.removeEventListener("keydown", handleInput);
  },[overWorkspace]);


  //checks if we are dragging a node
  useEffect(() => {
    if (dragNodeID == null) return;

    const handleDrag = (e: MouseEvent) => {
      const bounds = workspaceRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const smallX = Math.min(Math.max(e.clientX - bounds.left, 0), bounds.width);
      const smallY = Math.min(Math.max(e.clientY - bounds.top, 0), bounds.height);

      setNodes((prev) => 
        prev.map((node) => 
          node.id === dragNodeID ? {...node, x: smallX - dragOffset.x, y: smallY - dragOffset.y} : node
        )
      );
    }

    const handleUp = () => setdragNodeID(null);

    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", handleUp);

    return () => {window.removeEventListener("mousemove", handleDrag), window.removeEventListener("mouseup", handleUp)}
  }, [dragNodeID, overWorkspace, dragOffset])


  //component rendering
  return (
    <>
      <div className="h-screen flex justify-end">
        <div
          ref={workspaceRef}
          className="w-full h-full relative overflow-hidden"
          onMouseLeave={() => setoverWorkspace(false)}
          onMouseEnter={() => setoverWorkspace(true)}
        >
          <svg className="absolute top-1 left-0 w-full h-full pointer-events-none z-0">
          {groupedEdges.map((grouped) => {
            const {edge, index, total} = grouped;
            const startingNode = nodes.find((node) => node.id === edge.startID);
            const endingNode = nodes.find((node) => node.id === edge.endID);

            if (!startingNode || !endingNode) return null;
            return (
            <Edge
              key={edge.id}
              id={edge.id}
              weight = {edge.weight}
              highlighted={edge.highlighted}
              weightSize={weightSize}
              start={startingNode}
              end={endingNode}
              edgeIndex={index}
              edgeGroupNumber={total}
              setEdgeHovered={setEdgeHovered}
              isDirected={isDirected}
              isWeighted={isWeighted}
              nodeRadius={nodeSize}
              changeWeight={changeWeight}
            />
            )
            
          })}
          </svg>
          {nodes.map((nodes) => (
            <Node
              key={nodes.id}
              label={nodes.label}
              id={nodes.id}
              isHighlighted={nodes.highlighted}
              posx={nodes.x}
              posy={nodes.y}
              distance={nodes.distance}
              size={nodeSize}
              onMouseDown={() => setdragNodeID(nodes.id)}
              showLabel = {showNodeLabels}
              showID = {showNodeIDS}
              showDistance={showDistance}
              setNodeHovered = {setNodeHovered}
              setDragOffset = {setDragOffset}
            />
          ))}
        </div >
          <GraphMenu 
            keyBinds={keyBinds} 
            setKeyBinds={setKeyBinds} 
            nodeSize={nodeSize}
            setNodeSize={setNodeSize}
            weightFontSize={weightSize}
            setWeightFontSize={setWeightSize}
            showNodeLabels={showNodeLabels}
            setShowNodeLabels={setShoeNodeLabels}
            showNodeIDS={showNodeIDS}
            setShowNodesIDS={setShowNodeIDS}
            isWeighted={isWeighted}
            setIsWeighted={setIsWeighted}
            isDirected={isDirected}
            setIsDirected={setIsDirected}
            clearGraph={clearComponents}
            clearWeights={clearWeights}
            DFS={DFS}
            BFS={BFS}
            Dijkstra={Dijkstras}
            BellmanFord={BellmanFord}
            outputString ={outputString}
          />
      </div>
    </>
  );
};

export default Graph;
