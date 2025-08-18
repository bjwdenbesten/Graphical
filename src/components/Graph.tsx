import GraphMenu from "./GraphMenu";
import Node from "./Node";
import Edge from "./Edge";
import { useState, useEffect, useCallback, useRef } from "react";
import type {NodeData, EdgeData, groupedEdge, Pair} from "../types.ts";

import { DFS_main } from "../algorithms/DFS";
import { BFS_main } from "../algorithms/BFS";
import { Dijkstra_main } from "../algorithms/Dijkstra.ts";
import { BellmanFord_main } from "../algorithms/BellmanFord.ts";

//server imports
import { socket } from '../socket.ts';

import { useLocation } from "react-router-dom";


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

  const location = useLocation();

  const initialPartyData = location.state?.partyData;

  const nodeID = useRef<number>(0);
  const edgeID = useRef<number>(0);

  const [overWorkspace, setoverWorkspace] = useState(false);

  const [nodes, setNodes] = useState<any[]>(initialPartyData?.nodes || []);
  const [mousePosition, setMousePosition] = useState({ x: 20, y: 20 });
  const [nodeSize, setNodeSize] = useState(60);
  const [dragNodeID, setdragNodeID] = useState<number | null> (null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}> ({x: 0, y: 0});
  const[showNodeLabels, setShoeNodeLabels] = useState(true);
  const [showNodeIDS, setShowNodeIDS] = useState(false);
  const [nodeHovered, setNodeHovered] = useState<number | null> (null);

  //edge states
  const [edges, setEdges] = useState<EdgeData[]>(initialPartyData?.edges || []);
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
  const sizeRef = useRef({ width: 0, height: 0 });

  //graph states
  const [isWeighted, setIsWeighted] = useState(false);
  const [isDirected, setIsDirected] = useState(false);



  const [partyID, setPartyID] = useState<string> ("");
  const [inParty, setInParty] = useState<boolean>(false);
  const [connected, setConnected] = useState<number> (initialPartyData?.numConnected || 1 );

  //sync party data once

  useEffect(() => {
    if (initialPartyData) {
      setPartyID(initialPartyData.ID);
      localStorage.setItem("partyID", initialPartyData.ID);
      nodeID.current = initialPartyData.nodeid;
      edgeID.current = initialPartyData.edgeid;
      setInParty(true);
      console.log("initialized party data");
    }
  }, []);


  //run once to check for reconnection
  useEffect(() => {
    const tryRejoin = () => {
      const savedID = localStorage.getItem("partyID");
      if (!savedID) return;
      socket.emit("join-party", savedID)
    }
    socket.on("connect", () => {
      tryRejoin();
    })

    const onJoin = (data: any) => {
      if (data.res === "joined-party" && data.pData) {
        const p = data.pData;
        setNodes(p.nodes || []);
        setEdges(p.edges || []);
        nodeID.current = p.nodeid ?? nodeID.current;
        edgeID.current = p.edgeid ?? edgeID.current;
        setInParty(true);
        setPartyID(p.ID);
        setConnected(p.numConnected);
      }
      else {
        console.log(data.res);
        return;
      }
    }

    socket.on("join-party-result", onJoin);
    return () => {
      socket.off("connect");
      socket.off("join-party-result", onJoin);
    }
  }, [])


  const createParty = () => {
    socket.emit("create-party", {nodes, edges, nodeID: nodeID.current, edgeID: edgeID.current});
    setInParty(true);
  }

  const S_createNode = (x: number, y: number, id: number) => {
    socket.emit("create-node", {partyID, x, y, id});
  }

  const S_createEdge = (id: number, startID: number, endID: number, weight: number) => {
    socket.emit("create-edge", {partyID, id, startID, endID, weight});
  }

  const S_deleteNode = (id: number) => {
    socket.emit("delete-node", {partyID, id});

  }

  const S_deleteEdge = (id: number) => {
    socket.emit("delete-edge", {partyID, id});
  }

  const S_changeWeight = (id: number, newWeight: number) => {
    socket.emit("change-weight", {partyID, id, newWeight});
  }

  const S_clearGraph = () => {
    socket.emit("clear-graph", {partyID});
  }

  const S_clearWeights = () => {
    socket.emit("clear-weights", {partyID});
  }

  const S_insertGraph = (newNodes: NodeData[], newEdges: EdgeData[]) => {
    socket.emit("insert-graph", {partyID, newNodes, newEdges});
  }

  let lastEmitTime = 0;
  const T_INTERVAL = 100;

  const S_moveNode = (id: number, x: number, y: number) => {
    const now = Date.now();
    if (now - lastEmitTime > T_INTERVAL) {
      socket.emit("node-moved", {id, x, y, partyID});
      lastEmitTime = now;
    }
  }

  //client listeners
  useEffect(() => {
    socket.on("party-id", (data) => {
      setPartyID(data);
    })
    socket.on("node-created", (data: any) => {
      const newNode = data.node;
      newNode.size = nodeSize;
      setNodes((prev) => [...prev, newNode]);
      setNodes((prev) =>
      prev.map((node, index) => ({
        ...node,
        label: index + 1,
      }))
    )
    })
    socket.on("create-node-result", (data) => {
      console.log(data.res);
    })
    socket.on("node-move-update", (data: any) => {
      const id = data.id;
      const x = data.x;
      const y = data.y;
      setNodes((prev) =>
        prev.map((node) =>
          node.id === id ? {...node, x, y} : node
        )
      )
    })
    socket.on("edge-created", (data) => {
      const newEdge = data.edge;
      setEdges((prev) => [...prev, newEdge]);
    })
    socket.on("node-deleted", (data) => {
      const deletedID = data.nodeID;
      setNodes((prev) =>
        prev.filter((node) => node.id !== deletedID)
      )
      //filter out the edges stored locally that were connected to the node
      setEdges((prev) => {
        const filtered = prev.filter((edge) => edge.startID !== deletedID && edge.endID !== deletedID);
        return filtered;
      })
      //remap the labels
      setNodes((prev) =>
        prev.map((node, index) => ({
          ...node,
          label: index + 1,
        }))
      )
    })
    socket.on("delete-node-result", (data) => {
      console.log(data.res);
    })
    socket.on("edge-deleted", (data) => {
      const deleteEdgeID = data.edgeID;
      setEdges((prev) =>
        prev.filter((edge) => edge.id !== deleteEdgeID)
      )
    })
    socket.on("edge-deleted-result", (data) => {
      console.log(data.res);
    })
    socket.on("weight-changed", (data) => {
      const weight = data.weight;
      const id = data.edgeID;
      setEdges((prev) => 
        prev.map((edge) => edge.id === id ? {...edge, weight: weight} : edge)
      )
    })
    socket.on("cleared-graph", () => {
      setNodes([]);
      setEdges([]);
    })
    socket.on("cleared-weights", () => {
      setEdges((prev) => 
        prev.map((edge) => edge ? {...edge, weight: 0} : edge)
      )
    })
    socket.on("inserted-graph", (data) => {
      console.log('recieved');
      const newNodes = data.nNodes;
      const newEdges = data.nEdges;
      setNodes((prev) => [...prev, ...newNodes]);
      setEdges((prev) => [...prev, ...newEdges]);
    })
    socket.on("user-update", (data: any) => {
      const numMembers = data.numConnected;
      setConnected(numMembers);
    })
    return () => {
      socket.off("node-created");
      socket.off("edge-created");
      socket.off("node-deleted");
      socket.off("edge-deleted");
      socket.off("weight-changed");
      socket.off("cleared-graph");
      socket.off("inserted-graph");
      socket.off("user-update");
    }
  }, [socket])


  //front end functinoality below

  useEffect(() => {
    if (!workspaceRef.current) return;
  
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        sizeRef.current.width = entry.contentRect.width;
        sizeRef.current.height = entry.contentRect.height;
      }
    });
  
    observer.observe(workspaceRef.current);
    return () => observer.disconnect();
  }, []);


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
    if (!inParty) {
    setEdges(prev =>
      prev.map(edge => edge.id === id ? {...edge, weight: newWeight} : edge)
    );
    }
    else {
      S_changeWeight(id, newWeight);
    }
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
      setStartNode(null);
      setEndNode(null);
    }
  }, [startNode, endNode, setEdges]);

  useEffect(() => {
    setGroupedEdges(groupEdges(edges));
  }, [edges]);


  const createEdge = useCallback(() => {
    if (!startNode || !endNode) return;
    const id = edgeID.current++;
    if (!inParty) {
    setEdges((prev) => [
      ...prev,
      {
        id: id,
        weight: 0,
        startID: startNode.id,
        endID: endNode.id,
        highlighted: false
      },
    ]);
    }
    else {
      S_createEdge(id, startNode.id, endNode.id, 0);
    }
  }, [startNode, endNode, inParty, partyID]);

  useEffect(() => {
    const selectFirstNode = (e: MouseEvent) => {
      if (nodeHovered == null || e.button !== 2) return;
      nodes.map((node) => {
        node.id === nodeHovered ? setStartNode(node) : null
      })
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
    }

    window.addEventListener("mousedown", selectFirstNode);
    window.addEventListener("mouseup", selectSecondNode);
    return() => {window.removeEventListener("mousedown", selectFirstNode), window.removeEventListener("mouseup", selectSecondNode)}
  }, [nodeHovered, nodes, startNode]);



  //updates the node list with new node
  const createNode = useCallback(() => {
    const {x, y} = mouseRef.current;
    const id = nodeID.current++;
    if (!inParty) {
    setNodes((prev) => [
      ...prev,
      {
        id: id,
        label: prev.length + 1,
        x: x,
        y: y,
        size: nodeSize,
        distance: Infinity,
        highlighted: false
      },
    ]);
    }
    else {
      S_createNode(x, y, id);
    }
  }, [mousePosition, nodes, nodeSize, nodeID, inParty, partyID]);




  //deletes a component
  const deleteComponent = useCallback(() => {
    const nodeHovered = nodeRef.current;
    const edgeHovered = edgeRef.current;
    if (nodeHovered !== null) {
      if (!inParty) {
      setNodes((prev) => {
        const filtered = prev.filter((node)=>node.id !== nodeHovered);
        const relabeled = filtered.map((node, index) => ({
          ...node,
          label: index + 1,
        }));
        return relabeled;
      });
      setEdges((prev) => {
        const filtered = prev.filter((edge) => edge.startID !== nodeHovered && edge.endID !== nodeHovered);
        return filtered;
      })
      }
      else {
        S_deleteNode(nodeHovered);
      }
      setEdgeHovered(null);
      setNodeHovered(null);
    }
    if (edgeHovered !== null) {
      if (!inParty) {
      setEdges((prev) => {
        const filter = prev.filter((edge) => edge.id !== edgeHovered);
        return filter;
      })
      }
      else {
        S_deleteEdge(edgeHovered);
      }
      setEdgeHovered(null);
      setNodeHovered(null);
    }
  }, [nodeHovered, setNodes, edgeHovered, setEdges, inParty, partyID]);

  //clears all components from workspace
  const clearComponents = useCallback(() => {
    if (!inParty) {
      setNodes([]);
      setEdges([]);
    }
    else {
      S_clearGraph();
    }
    nodeID.current = 0;
    edgeID.current = 0;
  }, [setNodes, setEdges, inParty, partyID]);

  const clearWeights = useCallback(() => {
    if (!inParty) {
    setEdges((edge) => 
      edge.map((edge) => ({
        ...edge,
        weight: 0,
      }))
    )
    }
    else {
      S_clearWeights();
    }
  }, [edges, setEdges, inParty, partyID])

  const inputGraph = (input: string) => {
    const lines = input.trim().split("\n");
    const w = sizeRef.current.width;
    const h = sizeRef.current.height;
    const NS = nodeSize;
    const firstLine = lines[0].trim();
    const firstLineParts = firstLine.split(/\s+/); // split by spaces/tabs
    const nodeNumber = Number(firstLineParts[0]);
  
    if (Number.isNaN(nodeNumber) || nodeNumber > 100) return;
    clearComponents();
  
    const newNodes: NodeData[] = [];
  
    const centerXMin = w * 0.25;
    const centerXMax = w * 0.75 - 2 * NS;
    const centerYMin = h * 0.25;
    const centerYMax = h * 0.75 - 2 * NS;
  
    for (let cnt = 0; cnt < nodeNumber; cnt++) {
      const x = Math.random() * (centerXMax - centerXMin) + centerXMin;
      const y = Math.random() * (centerYMax - centerYMin) + centerYMin;
      const id = nodeID.current;
      nodeID.current++;
  
      newNodes.push({
        id: id + 1,
        label: cnt + 1,
        x,
        y,
        size: NS,
        distance: Infinity,
        highlighted: false
      });
    }
  
    if (!inParty) {
      setNodes(newNodes);
    }

    const allNodes = [...newNodes];
  
    const newEdges: EdgeData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(" ");
      if (parts.length < 2 || parts.length > 3) continue;
  
      const startLabel = Number(parts[0]);
      const endLabel = Number(parts[1]);
      const weight = parts.length === 3 ? Number(parts[2]) : 0;
  
      const startNode = allNodes.find((n) => n.label === startLabel);
      const endNode = allNodes.find((n) => n.label === endLabel);
      if (!startNode || !endNode || (startNode.id === endNode.id)) {
        continue;
      };

      const id = edgeID.current;
      edgeID.current++;
  
      newEdges.push({
        id: id,
        startID: startNode.id,
        endID: endNode.id,
        weight,
        highlighted: false
      });
    }
    if (!inParty) {
      setEdges(newEdges);
    }
    if (inParty) {
      S_insertGraph(newNodes, newEdges);
    }
  };



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
      if (inParty) {
        S_moveNode(dragNodeID, smallX - dragOffset.x, smallY - dragOffset.y);
      }
    }

    const handleUp = () => {
      if (inParty) {
        socket.emit("node-moved", {id: dragNodeID, x: mouseRef.current.x, y: mouseRef.current.y, partyid: partyID})
      }
      setdragNodeID(null);
    };

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
          className="w-full h-full relative overflow-hidden bg-gray-100"
          onMouseLeave={() => setoverWorkspace(false)}
          onMouseEnter={() => setoverWorkspace(true)}
        >
          <span className="position: absolute top-2 left-2">{inParty ? `Connected: ${connected}` : ""}</span>
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
            createGraph={inputGraph}
            createParty={createParty}
            partyID = {partyID}
            inParty={inParty}
          />
      </div>
    </>
  );
};

export default Graph;
