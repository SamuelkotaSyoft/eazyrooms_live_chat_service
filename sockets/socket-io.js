import { Server } from "socket.io";
import saveChatHistory from "../helpers/saveChatHistory.js";
// import saveChatHistory from "../../eazyrooms_live_chat_service_old/helpers/saveChatHistory.js";

let io;
export const socketConnection = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    /**
     *
     *
     * join room
     */
    socket.on("join", (data) => {
      console.log(data);
      socket.join(data.locationId);
    });

    /**
     *
     *
     * receive message from eazyrooms user via livechat
     */
    socket.on("RECEIVE_LIVECHAT_MESSAGE", async (data) => {
      try {
        await saveChatHistory({
          locationId: data?.locationId,
          chatId: data?.chatId,
          source: "livechat",
          message: {
            from: data?.from,
            id: data?.messageId,
            message: data?.message,
            timestamp: Date.now(),
            type: data?.type,
          },
        });

        //emit new message event to eazyrooms user
        emitNewMessage({
          roomId: data?.locationId,
          key: "NEW_MESSAGE",
          message: "",
        });

        //emit new message event to chat client
        emitNewMessage({
          roomId: data?.chatId,
          key: "NEW_MESSAGE",
          message: "",
        });
      } catch (err) {}
    });

    /**
     *
     *
     * receive message from eazyrooms user via whatsapp
     */
    socket.on("RECEIVE_WHATSAPP_MESSAGE", async (data) => {
      //emit new message event to eazyrooms user
      emitNewMessage({
        roomId: data?.locationId,
        key: "NEW_MESSAGE",
        message: "",
      });
    });

    /**
     *
     * disconnect
     */
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
};

export const emitNewMessage = ({ roomId, key, message }) => {
  io.to(roomId).emit(key, message);
};

export const getRooms = () => {
  io.sockets.adapter.rooms;
};
