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
  weightFontSize: number;
  setWeightFontSize: React.Dispatch<React.SetStateAction<number>>;
  showNodeLabels: boolean;
  setShowNodeLabels: React.Dispatch<React.SetStateAction<boolean>>;
  showNodeIDS: boolean;
  setShowNodesIDS: React.Dispatch<React.SetStateAction<boolean>>;
  isWeighted: boolean;
  setIsWeighted: React.Dispatch<React.SetStateAction<boolean>>;
  isDirected: boolean;
  setIsDirected: React.Dispatch<React.SetStateAction<boolean>>;
  clearGraph: () => void;
  clearWeights: () => void;
  DFS: (node : number) => void;
  BFS: (node: number) => void;
  Dijkstra: (node: number) => void;
  BellmanFord: (node: number) => void;
  outputString: string;
  createGraph: (node: string) => void;
};


const GraphMenu = ({ keyBinds, setKeyBinds, nodeSize, setNodeSize, weightFontSize, setWeightFontSize, showNodeLabels, setShowNodeLabels, showNodeIDS, setShowNodesIDS, isWeighted, setIsWeighted, isDirected, setIsDirected, clearGraph, clearWeights, DFS, BFS, Dijkstra, BellmanFord, outputString, createGraph}: GraphMenuProps) => {
  const [menuState, setMenuState] = useState("options");
  const [changingKey, setChangingKey] = useState<string | null>(null);
  const [visualState, setVisualState] = useState(false);
  const [graphsAlgosState, setGraphsAlgosState] = useState(false);
  const [miscState, setMiscState] = useState(false);
  const [partyState, setPartyState] = useState(false);
  const [startNode, setStartNode] = useState<number | null>(null);
  const [inputGraph, setInputGraph] = useState<string> ("");

  //server stuff
  const [partyCode, setPartyCode] = useState<string>("testcode");




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
      <div className="bg-gray-200 min-h-full w-100 flex flex-col z-1 overflow-y-auto">
      <div className="flex border-b">
        <button
          onClick={() => setMenuState("options")}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            menuState === "options"
              ? "bg-primary text-white border-b-2 border-primary"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          Options
        </button>
        <button
          onClick={() => setMenuState("keybinds")}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            menuState === "keybinds"
              ? "bg-primary text-white border-b-2 border-primary"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          Controls
        </button>
      </div>
        <div>
          {menuState === "options" && 

          //visuals dropdown
          <div>
            <h2 className="text-lg">
              <button onClick={() => setVisualState(!visualState)}  className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-slate-50 to-gray-100 hover:from-slate-100 hover:to-gray-200 border-b border-black transition-all duration-200 ">
                <span className="font-semibold text-gray-800 select-none">
                  Visuals
                </span>
                <svg
                className={`w-5 h-5 transform transition-transform duration-200 text-gray-600 ${
                visualState ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              </button>
            </h2>
            <div className = {visualState ? "block" : "hidden"}>
              <div className="p-2">
                <h2>Node Size</h2>
                <div>
                  <input className="w-full h-2 bg-primary rounded-lg appearance-none cursor-pointer slider accent-black" id = "node-range" type="range" min="50" max="200" value={nodeSize} onChange={(e) => setNodeSize(parseInt(e.target.value))}/>
                  <div>
                    <span id="node-value">{nodeSize}</span>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <h2>Weight Font Size</h2>
                <div>
                  <input className="w-full h-2 bg-primary rounded-lg appearance-none cursor-pointer slider accent-black" id = "node-range" type="range" min="10" max="100" value={weightFontSize} onChange={(e) => setWeightFontSize(parseInt(e.target.value))}/>
                  <div>
                    <span id="node-value">{weightFontSize}</span>
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
            <h2 className="text-lg">
              <button onClick={() => setGraphsAlgosState(!graphsAlgosState)}  className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-slate-50 to-gray-100 hover:from-slate-100 hover:to-gray-200 border-b border-black transition-all duration-200">
                <span className="font-semibold text-gray-800 select-none">
                  Graph / Algorithms
                </span>
                <svg
                className={`w-5 h-5 transform transition-transform duration-200 text-gray-600 ${
                graphsAlgosState ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              </button>
            </h2>
            <div className={graphsAlgosState ? "block" : "hidden"}>
              <div>
                <h1 className="font-bold p-2">Graph Properties</h1>
                <div className="p-2 flex flex-row">
                  <h2>Graph is:</h2>
                    <span className="ml-4">Undirected</span>
                    <input className="ml-2" type="radio" checked={!isDirected} onChange={() => setIsDirected(false)}/>
                    <span className="ml-4">Directed</span>
                    <input className="ml-2" type="radio" checked={isDirected} onChange={() => setIsDirected(true)}/>
                </div>
                <div className="p-2 flex flex-row items-center">
                  <h2>Graph is:</h2>
                    <span className="ml-4">Unweighted</span>
                    <input className="ml-2" type="radio" checked={!isWeighted} onChange={() => setIsWeighted(false)}/>
                    <span className="ml-4">Weighted</span>
                    <input className="ml-2" type="radio" checked={isWeighted} onChange={() => setIsWeighted(true)}/>
                </div>

              </div>
              <div>
                <h1 className="font-bold p-2">Algorithms</h1>
                <div className="rounded-lg ml-2  flex items-center flex-row">
                      <label className="block">Start Node</label>
                      <input
                        type="number"
                        value={startNode || ""}
                        onChange={(e) => setStartNode(Number(e.target.value) || null)}
                        className="w-20 px-3 py-2 border ml-4 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                <div className="p-2 flex justify-between items-center">
                  <h2>Depth-first search (DFS)</h2>
                  <button onClick={() => {
                    if (startNode !== null) {
                      DFS(startNode);
                    }
                  }} className="bg-primary text-white p-2 ml-2 rounded hover:bg-accent-light" >Start</button>
                </div>
                <div className="p-2 flex justify-between items-center">
                  <h2>Breadth-first search (BFS)</h2>
                  <button onClick={() => {
                    if (startNode !== null) {
                      BFS(startNode);
                    }
                  }}className="bg-primary text-white p-2 ml-2 rounded hover:bg-accent-light">Start</button>
                </div>
                <div className="p-2 flex justify-between items-center">
                  <h2>Dijkstra's Algorithm</h2>
                  <button onClick={() => {
                    if (startNode !== null) {
                      Dijkstra(startNode);
                    }
                  }}className="bg-primary text-white p-2 ml-2 rounded hover:bg-accent-light">Start</button>
                </div>
                <div className="p-2 flex justify-between items-center">
                  <h2>Bellman-Ford Algorithm</h2>
                  <button onClick={() => {
                    if (startNode !== null) {
                      BellmanFord(startNode);
                    }
                  }}className="bg-primary text-white p-2 ml-2 rounded hover:bg-accent-light">Compute</button>
                </div>
                <div className="p-2 flex flex-col items-center">
                  <h2>Output box</h2>
                 <textarea value={outputString} placeholder="Output appears here..."readOnly className="p-2 border rounded w-full h-40 resize-none"></textarea>
                </div>
              </div>
            </div>

            <h2 className="text-lg">
              <button onClick={() => setMiscState(!miscState)}  className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-slate-50 to-gray-100 hover:from-slate-100 hover:to-gray-200 border-b  border-black transition-all duration-200">
                <span className="font-semibold text-gray-800 select-none">
                  Misc
                </span>
                <svg
                className={`w-5 h-5 transform transition-transform duration-200 text-gray-600 ${
                miscState ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              </button>
            </h2>

            <div className={miscState ? "block" : "hidden"}>
              <div className="p-2 flex flex-col items-center">
                <span>Import Graph</span>
                <textarea placeholder="Paste graph data here..." onChange={(e) => {setInputGraph(e.target.value)}}className="border w-full h-40 resize-none p-2"></textarea>
                <button className="bg-primary mt-3 p-2 rounded text-white hover:bg-accent-light" onClick={() => createGraph(inputGraph)}>Generate Graph</button>
              </div>
              <div className="flex justify-center">
                <button className="ml-2 mr-2 w-full bg-gray-400 p-1 mt-4 rounded text-white hover:bg-gray-300" onClick={clearWeights}>Clear Weights</button>
              </div>
              <div className="flex justify-center mt-2 mb-4">
                <button className="ml-2 mr-2 w-full bg-gray-400 p-1 mt-4 rounded text-white hover:bg-gray-300" onClick={clearGraph}>Clear Graph</button>
              </div>
            </div>
            
            <h2 className="text-lg">
              <button onClick={() => setPartyState(!partyState)}  className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-slate-50 to-gray-100 hover:from-slate-100 hover:to-gray-200 border-b  border-black transition-all duration-200">
                <span className="font-semibold text-gray-800 select-none">
                  Party
                </span>
                <svg
                className={`w-5 h-5 transform transition-transform duration-200 text-gray-600 ${
                partyState ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              </button>
            </h2>
            <div className={partyState ? "block" : "hidden"}>
              <div className="flex flex-col items-center">
                <span className="text-xl mt-4">Party Code</span>
                <textarea value={partyCode} readOnly className="ml-2 mr-2 border p-2 text-center"></textarea>
                <button className="ml-2 mr-2 bg-primary mt-3 p-2 rounded text-white hover:bg-accent-light">Start a Party</button>
              </div>
            </div>


          </div>
          }
          

          {menuState === "keybinds" && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-4">
              {Object.entries(keyBinds).map(([action, key]) => (
                <div key={action} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">{action.replace('_', ' ')}</span>
                  <button
                    onClick={() => setChangingKey(action)}
                    className={`px-4 py-2 rounded-lg font-mono text-sm transition-all duration-200 ${
                      changingKey === action
                        ? "bg-primary text-white animate-pulse"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {changingKey === action ? "Press a key..." : key.toUpperCase()}
                  </button>
                </div>
              ))}
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-6 mt-6">Other Controls</h2>
            <div className="mb-4 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700" >Move Node</span>
              <span className="">Left Click + Hold</span>
            </div>
            <div className="mb-4 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700" >Create Edge</span>
              <span className="">Right Click + Hold</span>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default GraphMenu;
