import GraphMenu from "./GraphMenu";
import Node from "./Node";
import { useState, useEffect, useCallback, useRef } from "react";

let node_id = 0;

interface NodeData {
  id: number;
  label: number;
  x: number;
  y: number;
  size: number;
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
  const[showNodeLabels, setShoeNodeLabels] = useState(true);
  const [showNodeIDS, setShowNodeIDS] = useState(false);
  const [nodeHovered, setNodeHovered] = useState<number | null> (null);


  const mouseRef = useRef(mousePosition);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef(nodeHovered);

  //graph states
  const [isWeighted, setIsWeighted] = useState(false);
  const [isDirected, setIsDirected] = useState(false);

  //make sure it stays updated
  useEffect(() => {
    mouseRef.current = mousePosition;
  }, [mousePosition]);

  useEffect(() => {
    nodeRef.current = nodeHovered;
  }, [nodeHovered]);


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
      },
    ]);
    node_id++;
  }, [mousePosition, nodes, nodeSize]);


  //deletes a component
  const deleteComponent = useCallback(() => {
    const nodeHovered = nodeRef.current;
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
    }
  }, [nodeHovered, setNodes]);

  //clears all components from workspace
  const clearComponents = useCallback(() => {
    setNodes([]);
  }, [setNodes]);


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
          node.id === dragNodeID ? {...node, x: smallX, y: smallY} : node
        )
      );
    }


    const handleUp = () => setdragNodeID(null);

    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", handleUp);

    return () => {window.removeEventListener("mousemove", handleDrag), window.removeEventListener("mouseup", handleUp)}
  }, [dragNodeID, overWorkspace])


  //component rendering
  return (
    <>
      <div className="h-screen flex justify-end overflow-hidden">
        <div
          ref={workspaceRef}
          className="w-full h-full relative"
          onMouseLeave={() => setoverWorkspace(false)}
          onMouseEnter={() => setoverWorkspace(true)}
        >
          {nodes.map((nodes) => (
            <Node
              key={nodes.id}
              label={nodes.label}
              id={nodes.id}
              posx={nodes.x}
              posy={nodes.y}
              size={nodeSize}
              onMouseDown={() => setdragNodeID(nodes.id)}
              showLabel = {showNodeLabels}
              showID = {showNodeIDS}
              setNodeHovered = {setNodeHovered}
            />
          ))}
        </div>
          <GraphMenu 
            keyBinds={keyBinds} 
            setKeyBinds={setKeyBinds} 
            nodeSize={nodeSize}
            setNodeSize={setNodeSize}
            showNodeLabels={showNodeLabels}
            setShowNodeLabels={setShoeNodeLabels}
            showNodeIDS={showNodeIDS}
            setShowNodesIDS={setShowNodeIDS}
            isWeighted={isWeighted}
            setIsWeighted={setIsWeighted}
            isDirected={isDirected}
            setIsDirected={setIsDirected}
            clearGraph={clearComponents}
          />
      </div>
    </>
  );
};

export default Graph;
