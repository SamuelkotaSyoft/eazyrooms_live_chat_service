import express from "express"

import chats from "./chats"
import messages from "./messages"
import notes from "./notes"

const liveChatRoutes = express();

liveChatRoutes.use("/chats", chats);
liveChatRoutes.use("/messages", messages);

liveChatRoutes.use("/chats/:chatId/notes", (req, _, next) => {
    req.body.chatId = req.params.chatId;
    next();
}, notes);

module.exports = liveChatRoutes;