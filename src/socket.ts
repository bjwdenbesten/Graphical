import { io } from "socket.io-client";

const url = import.meta.env.CLIENT_URL || "http://localhost:3000";

export const socket = io(url);