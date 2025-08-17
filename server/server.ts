import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { Redis } from "ioredis";
import type {NodeData, EdgeData} from "../src/types.ts";

type partyData = {
  nodes: any;
  edges: any;
  nodeid: number;
  edgeid: number;
  ID: string;
  host: string;
  members: string[];
  numConnected: number;
  created: string;
}

const redis = new Redis();


const io = new Server(3000, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});


io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("create-party", async (data) => {
    //create unique ID for party
    const ID = uuidv4();
    socket.join(ID);
    socket.data.partyID = ID;

    const cachedData: partyData = {
      nodes: data.nodes,
      edges: data.edges,
      nodeid: data.nodeID,
      edgeid: data.edgeID,
      ID: ID,
      host: socket.id,
      members: [socket.id],
      numConnected: 1,
      created: new Date().toISOString()
    };

    console.log(cachedData.nodeid);

    await redis.setex(`party:${ID}`, 24 * 60 * 60, JSON.stringify(cachedData));
    await redis.set(`party:${ID}:nextNodeID`, data.nodeID);
    await redis.set(`party:${ID}:nextEdgeID`, data.edgeID);

    console.log(`Room created at ${ID}`);
    socket.emit("party-id", ID);
  })

  socket.on("join-party", async (partyId) => {
    try {
      //retrieve from redis
      const cachedPartyData = await redis.get(`party:${partyId}`);
      console.log(partyId);
      const room = io.sockets.adapter.rooms.has(partyId);

      if (!cachedPartyData || !room) {
        if (!cachedPartyData) {
          console.log("Party data missing");
        }
        else {
          console.log("no such room")
        }
        socket.emit("join-party-result", {res: "no-party"});
        return;
      }
      socket.join(partyId);
      socket.data.partyID = partyId;
      console.log(`${socket.id} joined party: ${partyId}`)

      const pData: partyData = JSON.parse(cachedPartyData);
      if (!pData.members.includes(socket.id)) {
        pData.members.push(socket.id);
        const num = io.sockets.adapter.rooms.get(partyId)?.size;
        if (num !== undefined) {
          pData.numConnected = num;
        }
        await redis.setex(`party:${partyId}`, 24 * 60 * 60, JSON.stringify(pData));
      }

      socket.emit("join-party-result", {
        res: "joined-party",
        pData: {
          nodes: pData.nodes,
          edges: pData.edges,
          nodeid: pData.nodeid,
          edgeid: pData.edgeid,
          members: pData.members,
          numConnected: pData.numConnected,
          host: pData.host,
          ID: pData.ID
        }
      });

      //send to users in the party that a user joined
      console.log(pData.numConnected);
      io.to(partyId).emit("user-update", {
        numConnected: pData.numConnected,
      })

    }
    catch (e) {
      console.log("Error in retrieving party data");
      socket.emit("join-party-result", {res: "error"});
    }
  })

  socket.on("create-node", async (data: {partyID: string, x: number, y: number, id: number}) => {
    const {partyID, x, y, id} = data;
    try {
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("create-node-result", {res: "no-party"});
        return;
      }
      console.log("creating node...");

      const pData: partyData = JSON.parse(cachedParty);

      const newNodeID = await redis.incr(`party:${partyID}:nextNodeID`);

      const newNode: NodeData = {
        id: newNodeID,
        label: pData.nodes.length + 1,
        x: x,
        y: y,
        size: 0,
        distance: Infinity,
        highlighted: false,
      }
      pData.nodes.push(newNode);

      await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));
      io.to(partyID).emit("node-created", {node: newNode});
      console.log("Sent new nodes to party memebers..");
    }
    catch (error) {
      console.log("Error in create node");
      socket.emit("create-node-result", {res: "error"});
    }
  })

  socket.on("node-moved", async(data) => {
    const {id, x, y, partyID} = data;
    try {
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        return;
      }
      const pData: partyData = JSON.parse(cachedParty);

      const nodeIndex = pData.nodes.findIndex((n: NodeData) => n.id === id);
      if (nodeIndex === -1) return;

      pData.nodes[nodeIndex].x = x;
      pData.nodes[nodeIndex].y = y;

      await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));

      io.to(partyID).emit("node-move-update", {id, x, y});
    }
    catch (error) {
      console.log("Error in move-node");
    }
  })

  socket.on("create-edge", async (data : {partyID: string, id: number, startID: number, endID: number, weight: number}) => {
    const {partyID, id, startID, endID, weight} = data;
    try {
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("create-node-result", {res: "no-party"});
        return;
      }

      const pData = JSON.parse(cachedParty);
      const newEdgeID = await redis.incr(`party:${partyID}:nextEdgeID`);
      const newEdge: EdgeData = {
        id: newEdgeID,
        weight: weight,
        startID: startID,
        endID: endID,
        highlighted: false
      }

      pData.edges.push(newEdge);
      await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));
      io.to(partyID).emit("edge-created", {edge: newEdge});
      console.log("edge created server side");
    }
    catch (error) {
      console.log("error in create-edge");
    }
  })


  socket.on("delete-node", async (data) => {
    const {partyID, id} = data;
    try {
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("delete-node-result", {res: "no-party"});
        return;
      }
      

      const pData = JSON.parse(cachedParty);
      pData.nodes = pData.nodes.filter((node: NodeData) => node.id !== id);
      pData.nodes = pData.nodes.map((node, index) => ({...node, label: index + 1}));
      pData.edges = pData.edges.filter((edge: EdgeData) => (edge.endID !== id && edge.startID !== id));
      await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));
      io.to(partyID).emit("node-deleted", {nodeID: id});
      console.log("deleted node server side")
    }
    catch (e) {
      console.log("error in delete node");
    }
  })

  socket.on("delete-edge", async(data) => {
    const {partyID, id} = data;
    try {
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("delete-edge-result", {res: "no-party"});
        return;
      }

      const pData = JSON.parse(cachedParty);
      pData.edges = pData.edges.filter((edge: EdgeData) => edge.id !== id);
      await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));
      io.to(partyID).emit("edge-deleted", {edgeID: id});
    }
    catch (e) {
      console.log("error in delete edge");
    }
  })

  socket.on("change-weight", async(data) => {
    const {partyID, id, newWeight} = data;
    try {
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("delete-edge-result", {res: "no-party"});
        return;
      }

      const pData = JSON.parse(cachedParty);
      const index = pData.edges.findIndex((edge: EdgeData) => edge.id === id);
      console.log(index);
      pData.edges[index].weight = newWeight;
      await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));
      io.to(partyID).emit("weight-changed", {edgeID: id, weight: newWeight});
    }
    catch (error) {
      console.log("error in change-weight");
    }
  })

  socket.on("clear-graph", async(data) => {
    const {partyID} = data;
    try {
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("clear-graph-result", {res: "no-party"});
        return;
      }
      
      const pData = JSON.parse(cachedParty);
      pData.nodes = [];
      pData.edges = [];
      await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));
      io.to(partyID).emit("cleared-graph");
    }
    catch(error) {
      console.log("error in clear-graph");
    }
  })

  socket.on("clear-weights", async(data) => {
    const {partyID} = data;
    try {
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("clear-weights-result", {res: "no-party"});
        return;
      }
      const pData = JSON.parse(cachedParty);
      pData.edges = pData.edges.map((edge) => edge ? {...edge, weight: 0} : edge);
      await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));
      io.to(partyID).emit("cleared-weights");
    }
    catch (e) {
      console.log("error in clear-weights");
    }
  })

  socket.on("insert-graph", async(data) => {
    const {partyID, newNodes, newEdges} = data;
    try {
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("insert-weights-result", {res: "no-party"});
        return;
      }
      const pData = JSON.parse(cachedParty);
      const idMap = new Map<number, number>();

      for (let i = 0; i < newNodes.length; i++) {
        const newNodeID = await redis.incr(`party:${partyID}:nextNodeID`);
        idMap.set(newNodes[i].id, newNodeID);
        newNodes[i].id = newNodeID;
        pData.nodes.push(newNodes[i]);
      }
      for (let i = 0; i < newEdges.length; i++) {
        const newEdgeID = await redis.incr(`party:${partyID}:nextEdgeID`);
        const start = newEdges[i].startID;
        const end = newEdges[i].endID;
        newEdges[i].startID = idMap.get(start);
        newEdges[i].endID = idMap.get(end);
        newEdges[i].id = newEdgeID;
        pData.edges.push(newEdges[i]);
      }
      await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));
      io.to(partyID).emit("inserted-graph", {nNodes: newNodes, nEdges: newEdges});
    }
    catch (e) {
      console.log("error in insert-graph");
    }
  })
  socket.on("disconnect", async(reason) => {
    console.log("disconnected socket");
    const partyID = socket.data.partyID;
    if (!partyID) return;

    const cachedParty = await redis.get(`party:${partyID}`);
    if (!cachedParty) return;
    const pData = JSON.parse(cachedParty);
    pData.members = pData.members.filter((m) => m !== socket.id);
    pData.numConnected = (io.sockets.adapter.rooms.get(partyID)?.size || 0);

    await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));

    io.to(partyID).emit("user-update", {
      numConnected: pData.numConnected,
    })
  })



});