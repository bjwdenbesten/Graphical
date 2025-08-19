import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuidv4 } from "uuid";
import { Redis } from "ioredis";
import { z } from "zod";


import type {NodeData, EdgeData} from "./types.ts";

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

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

const partyIdSchema = z.uuidv4();

const NodeSchema = z.object({
  id: z.number().int().min(0).max(100000),
  label: z.number().optional(),
  x: z.number(),
  y: z.number(),
  size: z.number().optional().default(0),
  distance: z.number().nullable().optional().default(Infinity),
  highlighted: z.boolean().optional().default(false),
});

const EdgeSchema = z.object({
  id: z.number().int().min(0).max(100000),
  weight: z.number().min(-100000).max(10000),
  startID: z.number().int().min(0).max(100000),
  endID: z.number().int().min(0).max(100000),
  highlighted: z.boolean().optional().default(false),
});


//simple redis mutex lock
class RedisMutex {
  private redis: Redis;
  private lockTimeout: number;

  constructor(redis: Redis, lockTimeout = 5000) {
    this.redis = redis;
    this.lockTimeout = lockTimeout;
  }

  //aquire lock for the key
  async aquire(key:string, timeout = 10000) : Promise<string> {
    const lockKey = `lock${key}`;
    const lockVal = uuidv4();

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const res = await this.redis.set(lockKey, lockVal, 'PX', this.lockTimeout, 'NX');
      if (res =='OK') return lockVal;
      await new Promise(resolve => setTimeout(resolve, 50));
    };
    throw new Error(`Failed to get lock for ${key}`);
  }

  //release lock
  async release(key: string, lockVal: string): Promise<void> {
    const lockKey = `lock${key}`;

    //lua script - delete key if it equals our key
    const script = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(script, 1, lockKey, lockVal)
  }
}

const mtx = new RedisMutex(redis);


//some checks are redundant but ok
const validateData = {
  partyId: (partyId:any) => {
    if (!partyId || typeof partyId !== 'string') {
      return {valid: false, error: "invalid PID"};
    }
    try {
      partyIdSchema.parse(partyId);
    }
    catch (error) {
      return {valid: false, error: "invalid PID"};
    }
    return {valid: true};
  },
  coords: (x:any, y:any) => {
    if (typeof x !== 'number' || typeof y !== 'number') {
      return {valid: false, error: "Coords not numbers"};
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return {valid: false, error: "Coordinates must be finite numbers"};
    }
    return {valid: true};
  },
  ID: (id:any) => {
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 0) {
      return {valid: false, error: "Invalid node ID"};
    }
    if (id > 100000) {
      return {valid: false, error: "Too large ID"}
    }
    return {valid: true};
  },
  weight: (weight:any) => {
    if (typeof weight !== 'number') {
      return {valid: false, error: "Weight must be number"}
    }
    if (!Number.isFinite(weight)) {
      return {valid: false, error: "Weight must be finite"};
    }
    if (weight < -100000 || weight > 10000) {
      return {valid: false, error: "Weight out of bounds"};
    }
    return {valid: true};
  },
  graphData: (nodes:any, edges:any) => {
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return {valid: false, error: "Not arrays"};
    }
    if (nodes.length > 500 || edges.length > 2000) {
      return {valid: false, error: "Too many edges or nodes"};
    }
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      try {
        const res = NodeSchema.parse(node);
      }
      catch (error) {
        console.log("Node validation fail", error);
        return {valid: false, error: "invalid node"};
      }
    }

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      try {
        const res = EdgeSchema.parse(edge);
      }
      catch {
        console.log("Edge validation fail");
        return {valid: false, error: "invalid edge"};
      }
    }
    return {valid: true};
  }
}

//simple rate limiter

function rateLimiter(limit: number, interval: number) {
  let tokens = limit;
  let last = Date.now();

  return () => {
    const now = Date.now();
    const elapsed = now - last;
    if (elapsed > interval) {
      tokens = limit;
      last = now;
    }
    if (tokens > 0) {
      tokens--;
      return true;
    }
    return false;
  };
}

const server = createServer();

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`CLIENT_URL: ${process.env.CLIENT_URL}`);
  console.log(`REDIS_URL: ${process.env.REDIS_URL ? 'Set' : 'Not set'}`);
});

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? (process.env.CLIENT_URL ? [process.env.CLIENT_URL] : "*")
      : ["http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
});

//session tracking
io.use((socket, next) => {
  let sesID = socket.handshake.auth.sessionId;
  if (!sesID) {
    sesID = uuidv4();
  }

  socket.data.sessionId = sesID;
  socket.data.joinedAt = Date.now();
  next();
})


io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  const checkRate = rateLimiter(10, 1000);

  //wrap socket listeners in rate limiter to 10 tokens / sec

  function limited(event: string, handler: (...args: any[]) => void) {
    socket.on(event, (...args) => {
      if (!checkRate()) {
        console.log(`Rate limit hit from ${socket.id} on ${event}`);
        socket.emit("rate-limit", {event});
        return;
      }
      handler(...args);
    });
  }

  limited ("create-party", async (data) => {
    //validate data from graph first
    const verify = validateData.graphData(data.nodes, data.edges);
    if (!verify.valid) return;
    if (verify.error) {
      console.log(verify.error);
    }

    //create unique ID for party
    const ID = uuidv4();
    if (socket.data.partyID) {
      socket.emit("create-party-result", {res: "already in party"});
      return;
    }
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

  limited("join-party", async (partyId) => {
    const verify = validateData.partyId(partyId);
    if (!verify.valid) return;
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
          numConnected: pData.numConnected,
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
      socket.emit("join-party-result", {res: "error"});
    }
  })

  limited ("create-node", async (data: {partyID: string, x: number, y: number, id: number}) => {
    const {partyID, x, y, id} = data;
    const verifyCoords = validateData.coords(x, y);
    const verifyPID = validateData.partyId(partyID);
    if (!verifyCoords.valid || !verifyPID.valid) return;
    let lockVal: string | null = null;
    try {
      lockVal = await mtx.aquire(partyID);
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("create-node-result", {res: "no-party"});
        return;
      }
      console.log("creating node...");

      const pData: partyData = JSON.parse(cachedParty);
      if (pData.nodes.length > 500) return;

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
    } finally {
      if (lockVal) {
        await mtx.release(partyID, lockVal);
      }
    }
  })

  limited ("node-moved", async(data) => {
    const {id, x, y, partyID} = data;
    const verifyCoords = validateData.coords(x, y);
    const verifyPID = validateData.partyId(partyID);
    if (!verifyCoords.valid || !verifyPID.valid) return;
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

  limited ("create-edge", async (data : {partyID: string, id: number, startID: number, endID: number, weight: number}) => {
    const {partyID, id, startID, endID, weight} = data;
    const verifyPID = validateData.partyId(partyID);
    const v1 = validateData.ID(startID);
    const v2 = validateData.ID(endID);
    const validateWeight = validateData.weight(weight);
    let lockVal: string | null = null;
    if (!verifyPID.valid || !v1.valid || !v2.valid || !validateWeight.valid) return;
    if (!verifyPID.valid) return;
    try {
      lockVal = await mtx.aquire(partyID);
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("create-node-result", {res: "no-party"});
        return;
      }

      const pData = JSON.parse(cachedParty);
      if (pData.edges.length > 2000) return;
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
    finally {
      if (lockVal) {
        await mtx.release(partyID, lockVal);
      }
    }
  })


  limited ("delete-node", async (data) => {
    const {partyID, id} = data;
    const verifyPID = validateData.partyId(partyID);
    const verify = validateData.ID(id);
    let lockVal: string | null = null;
    if (!verifyPID.valid || !verify.valid) return;
    try {
      lockVal = await mtx.aquire(partyID);
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("delete-node-result", {res: "no-party"});
        return;
      }
      

      const pData = JSON.parse(cachedParty);
      pData.nodes = pData.nodes.filter((node: NodeData) => node.id !== id);
      pData.nodes = pData.nodes.map((node:any, index:any) => ({...node, label: index + 1}));
      pData.edges = pData.edges.filter((edge: EdgeData) => (edge.endID !== id && edge.startID !== id));
      await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));
      io.to(partyID).emit("node-deleted", {nodeID: id});
      console.log("deleted node server side")
    }
    catch (e) {
      console.log("error in delete node");
    }
    finally {
      if (lockVal) {
        await mtx.release(partyID, lockVal);
      }
    }
  })

  limited ("delete-edge", async(data) => {
    const {partyID, id} = data;
    const verifyPID = validateData.partyId(partyID);
    const verify = validateData.ID(id);
    let lockVal: string | null = null;
    if (!verifyPID.valid || !verify.valid) return;
    try {
      lockVal = await mtx.aquire(partyID);
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
    finally {
      if (lockVal) {
        await mtx.release(partyID, lockVal);
      }
    }
  })

  limited ("change-weight", async(data) => {
    const {partyID, id, newWeight} = data;
    const verifyPID = validateData.partyId(partyID);
    const verify = validateData.ID(id);
    const validateweight = validateData.weight(newWeight);
    if (!verifyPID.valid || !verify.valid || !validateweight.valid) return;
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

  limited ("clear-graph", async(data) => {
    const {partyID} = data;
    const verifyPID = validateData.partyId(partyID);
    let lockVal: string | null = null;
    if (!verifyPID.valid) return;
    try {
      lockVal = await mtx.aquire(partyID);
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
    finally {
      if (lockVal) {
        await mtx.release(partyID, lockVal);
      }
    }
  })

  limited ("clear-weights", async(data) => {
    const {partyID} = data;
    try {
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("clear-weights-result", {res: "no-party"});
        return;
      }
      const pData = JSON.parse(cachedParty);
      pData.edges = pData.edges.map((edge:any) => edge ? {...edge, weight: 0} : edge);
      await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));
      io.to(partyID).emit("cleared-weights");
    }
    catch (e) {
      console.log("error in clear-weights");
    }
  })

  limited ("insert-graph", async(data) => {
    const {partyID, newNodes, newEdges} = data;
    const verify = validateData.graphData(newNodes, newEdges);
    let lockVal: string | null = null;
    if (!verify.valid) return;
    try {
      lockVal = await mtx.aquire(partyID);
      const cachedParty = await redis.get(`party:${partyID}`);
      if (!cachedParty) {
        socket.emit("insert-weights-result", {res: "no-party"});
        return;
      }
      const pData = JSON.parse(cachedParty);
      pData.nodes = [];
      pData.edges = [];
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
    finally {
      if (lockVal) {
        await mtx.release(partyID, lockVal);
      }
      console.log("Haowidjaiowdoaj");
    }
  })
  socket.on("disconnect", async(reason) => {
    console.log("disconnected socket");
    const partyID = socket.data.partyID;
    if (!partyID) return;

    const cachedParty = await redis.get(`party:${partyID}`);
    if (!cachedParty) return;
    const pData = JSON.parse(cachedParty);
    pData.members = pData.members.filter((m:any) => m !== socket.id);
    pData.numConnected = (io.sockets.adapter.rooms.get(partyID)?.size || 0);

    await redis.setex(`party:${partyID}`, 24 * 60 * 60, JSON.stringify(pData));

    io.to(partyID).emit("user-update", {
      numConnected: pData.numConnected,
    })
  })



});