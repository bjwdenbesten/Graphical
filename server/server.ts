import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";


const io = new Server(3000, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});


io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("create-party", (data) => {
    const ID = uuidv4();
    socket.join(ID);
    console.log(`Room created at ${ID}`);
    socket.emit("party-id", ID);
  })

  socket.on("join-party", (data) => {
    const party = io.sockets.adapter.rooms.get(data);
    let result = "no-party";
    if (party) {
      result = "joined-party";
    }
    socket.emit("join-party-result", {res: result});
  })
});