import { io } from "socket.io-client";

const url = process.env.CLIENT_URL || "http://localhost:3000";

export const socket = io(url);