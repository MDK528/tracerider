import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { verifyAccessToken } from "../../common/utils/jwt.js";
import { ApiError } from "../../common/utils/apiError.js";
import { registerHandlers } from "./realtime.handlers.js";

let io: Server;

const initIO = (httpServer: HttpServer): Server => {
    io = new Server(httpServer, {
        cors: {
            // origin: process.env.CLIENT_URL,
            origin : "*",
            credentials: true,
        },
    });

    io.use((socket, next) => {
        // console.log("Socket middleware hit");
        // console.log("query token:", socket.handshake.query.token);
        // console.log("auth token:", socket.handshake.auth.token);
        // console.log("headers token:", socket.handshake.headers.token);
        const token = 
            (socket.handshake.auth.token as string | undefined) ??
            (socket.handshake.query.token as string | undefined) ??
            (socket.handshake.headers.token as string | undefined);

        if (!token) return next(new ApiError(401, "Not authenticated"));

        try {
            const decoded = verifyAccessToken(token);
            socket.data.userId = decoded.id;
            // console.log("Socket auth success, userId:", decoded.id);
            next();
        } catch (err) {
            console.error("Socket auth failed:", err);
            next(new Error("Invalid or expired token"));
        }
    });

    io.on("connection", (socket) => {
        // console.log(`Socket connected: ${socket.id} | user: ${socket.data.userId}`);
        registerHandlers(io, socket);
    });

    io.engine.on("connection_error", (err) => {
        console.log("Connection error:", err.code, err.message, err.context);
    });

    return io;
};

const getIO = (): Server => {
    if (!io) throw new ApiError(500, "Socket.IO not initialized");
    return io;
};

export { initIO, getIO };