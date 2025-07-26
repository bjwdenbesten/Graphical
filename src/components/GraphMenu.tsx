import { useState, useEffect } from "react";

type KeyBinds = {
  Create_Node: string;
  Delete: string;
};

type GraphMenuProps = {
  keyBinds: KeyBinds;
  setKeyBinds: React.Dispatch<React.SetStateAction<KeyBinds>>;
  nodeSize: number;
  setNodeSize: React.Dispatch<React.SetStateAction<number>>;
  showNodeLabels: boolean;
  setShowNodeLabels: React.Dispatch<React.SetStateAction<boolean>>;
  showNodeIDS: boolean;
  setShowNodesIDS: React.Dispatch<React.SetStateAction<boolean>>;
  isWeighted: boolean;
  setIsWeighted: React.Dispatch<React.SetStateAction<boolean>>;
  isDirected: boolean;
  setIsDirected: React.Dispatch<React.SetStateAction<boolean>>;
  clearGraph: () => void;
};


const GraphMenu = ({ keyBinds, setKeyBinds, nodeSize, setNodeSize, showNodeLabels, setShowNodeLabels, showNodeIDS, setShowNodesIDS, isWeighted, setIsWeighted, isDirected, setIsDirected, clearGraph}: GraphMenuProps) => {
  const [menuState, setMenuState] = useState("options");
  const [changingKey, setChangingKey] = useState<string | null>(null);
  const [visualState, setVisualState] = useState(true);
  const [graphsAlgosState, setGraphsAlgosState] = useState(true);
  const [miscState, setMiscState] = useState(false);




  useEffect(() => {
    if (changingKey === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const newKey = e.key;

      setKeyBinds((prev) => ({
        ...prev,
        [changingKey]: newKey,
      }));

      setChangingKey(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changingKey, setKeyBinds]);

  return (
    <>
      <div className="bg-gray-300 h-full w-100 flex flex-col z-1">
        <div className="flex justify-center border-b border-black">
          <button
            onClick={() => setMenuState("options")}
            className={`w-1/2 p-2 ${
              menuState === "options" ? "bg-amber-200" : "bg-gray-300"
            }`}
          >
            Options
          </button>
          <button
            onClick={() => setMenuState("keybinds")}
            className={`w-1/2 p-2 ${
              menuState === "keybinds" ? "bg-amber-200" : "bg-gray-300"
            }`}
          >
            Keybinds
          </button>
        </div>
        <div>
          {menuState === "options" && 

          //visuals dropdown
          <div>
            <h2 className="p-2 text-lg">
              <button onClick={() => setVisualState(!visualState)}  className="w-full hover:bg-gray-400 border">
                <span className="select-none">
                  Visuals
                </span>
              </button>
            </h2>
            <div className = {visualState ? "block" : "hidden"}>
              <div className="p-2">
                <h2>Node Size</h2>
                <div>
                  <input className="select-none" id = "node-range" type="range" min="50" max="200" value={nodeSize} onChange={(e) => setNodeSize(parseInt(e.target.value))}/>
                  <div>
                    <span id="node-value">{nodeSize}</span>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <h2>Node Labels are: {showNodeLabels ? "Visible" : "Hidden"}</h2>
                <input type="checkbox" checked = {showNodeLabels} onChange = {(e) => setShowNodeLabels(e.target.checked)}/>

              </div>
              <div className="p-2">
                <h2>Node IDS are: {showNodeIDS? "Visible" : "Hidden"}</h2>
                <input type="checkbox" checked={showNodeIDS} onChange={(e) => setShowNodesIDS(e.target.checked)}/>
              </div>
            </div>
            <h2 className="p-2 text-lg">
              <button onClick={() => setGraphsAlgosState(!graphsAlgosState)} className="w-full hover:bg-gray-400 border">
                <span className="select-none">
                  Graphs / Algorithms
                </span>
              </button>
            </h2>
            <div className={graphsAlgosState ? "block" : "hidden"}>
              <div>
                <h1 className="font-bold p-2">Graph States</h1>
                <div className="p-2 flex flex-row">
                  <h2>Graph is:</h2>
                    <span className="ml-4">Undirected</span>
                    <input className="ml-2" type="radio" checked={!isDirected} onChange={() => setIsDirected(false)}/>
                    <span className="ml-4">Directed</span>
                    <input className="ml-2" type="radio" checked={isDirected} onChange={() => setIsDirected(true)}/>
                </div>
                <div className="p-2 flex flex-row">
                  <h2>Graph is:</h2>
                    <span className="ml-4">Unweighted</span>
                    <input className="ml-2" type="radio" checked={!isWeighted} onChange={() => setIsWeighted(false)}/>
                    <span className="ml-4">Weighted</span>
                    <input className="ml-2" type="radio" checked={isWeighted} onChange={() => setIsWeighted(true)}/>
                </div>

              </div>
              <div>
                <h1 className="font-bold p-2">Algorithms</h1>
                <div className="p-2 flex flex-row items-center">
                  <h2>Depth-first search (DFS)</h2>
                  <button className="bg-gray-400 p-1 ml-2 rounded">Start</button>
                </div>
                <div className="p-2 flex flex-row items-center">
                  <h2>Breadth-first search (BFS)</h2>
                  <button className="bg-gray-400 p-1 ml-2 rounded">Start</button>
                </div>
                <div className="p-2 flex flex-row items-center">
                  <h2>Dijkstra's Algorithm</h2>
                  <button className="bg-gray-400 p-1 ml-2 rounded">Start</button>
                </div>
              </div>
            </div>
            <h2 className="p-2 text-lg">
              <button onClick={() => setMiscState(!miscState)} className="w-full hover:bg-gray-400 border">
                <span className="select-none">
                  Misc
                </span>
              </button>
            </h2>

            <div className={miscState ? "block" : "hidden"}>
              <div className="flex justify-center">
              <button className="bg-gray-400 p-1 rounded border-2" onClick={clearGraph}>Clear Graph</button>
            </div>
            </div>
          </div>
          
          }
          

          {menuState === "keybinds" && (
            <div className="flex flex-col padding-2 items-center">
              {Object.entries(keyBinds).map(([action, key]) => (
                <div key={action} className="mt-5">
                  <span className="p-2">{action}:</span>
                  <button
                    className="bg-gray-200 p-2"
                    onClick={() => setChangingKey(action)}
                  >
                    {changingKey === action ? "Press a key..." : "key " + key}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GraphMenu;
