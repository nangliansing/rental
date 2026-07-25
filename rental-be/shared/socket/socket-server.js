import { Server } from "socket.io";

import { verifyAccessToken } from "../auth/index.js";
import { SOCKET_ERROR_CODES, SOCKET_EVENTS } from "./socket.constants.js";
import User from "../../modules/user/user.model.js";
import { USER_STATUSES } from "../../modules/user/user.constants.js";

let io = null;

const getHandshakeToken = (socket) => {
  const authToken = socket.handshake.auth?.token;

  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim();
  }

  const authorization = socket.handshake.headers?.authorization;

  if (
    typeof authorization === "string" &&
    authorization.startsWith("Bearer ")
  ) {
    return authorization.slice("Bearer ".length).trim();
  }

  return null;
};

const buildSocketError = (message, code) => {
  const error = new Error(message);
  error.data = { code };

  return error;
};

export const getUserSocketRoom = (userId) => {
  return `user:${userId}`;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = getHandshakeToken(socket);

    if (!token) {
      return next(
        buildSocketError(
          "Access token is required",
          SOCKET_ERROR_CODES.UNAUTHORIZED,
        ),
      );
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub)
      .select("_id role status")
      .lean();

    if (!user) {
      return next(
        buildSocketError("User not found", SOCKET_ERROR_CODES.UNAUTHORIZED),
      );
    }

    if (user.status !== USER_STATUSES.ACTIVE) {
      return next(
        buildSocketError("User is not active", SOCKET_ERROR_CODES.FORBIDDEN),
      );
    }

    socket.data.user = {
      id: user._id.toString(),
      role: user.role,
      status: user.status,
    };

    return next();
  } catch {
    return next(
      buildSocketError(
        "Invalid or expired access token",
        SOCKET_ERROR_CODES.UNAUTHORIZED,
      ),
    );
  }
};

export const initializeSocketServer = (httpServer, { allowedOrigins }) => {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    socket.join(getUserSocketRoom(socket.data.user.id));
  });

  return io;
};

export const getSocketServer = () => {
  return io;
};

export const closeSocketServer = async () => {
  if (!io) return;

  const socketServer = io;
  io = null;

  await new Promise((resolve) => {
    socketServer.close(resolve);
  });
};

export const emitToUser = (userId, eventName, payload) => {
  if (!io || !userId) return false;

  io.to(getUserSocketRoom(userId)).emit(eventName, payload);

  return true;
};
