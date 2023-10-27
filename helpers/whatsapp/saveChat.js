import mongoose from "mongoose";
import Chat from "../../models/chat.model";
import Message from "../../models/message.model";
import socketMessage from "../socketMessage";

async function saveMessage(body) {
  const ObjectId = mongoose.Types.ObjectId;

  const { org, to, message, from, botId, chatId, type = "WHATSAPP" } = body;

  let chat, messageResponse;
  try {
    /**
     * Checking if chatID is sent or not
     * If not sent geting chat based on from and to id
     * if present based on id
     */
    if (!chatId) {
      chat = await Chat.findOne({
        org: org,
        active: true,
        chatType: type,
        $and: [
          { members: { $elemMatch: { id: from } } },
          { members: { $elemMatch: { id: to } } },
        ],
      });
    } else {
      chat = await Chat.findOne({
        _id: new ObjectId(chatId),
        org: org,
        active: true,
      });
    }

    /**
     * Checking if chat exists or not
     * if not exists creating a chat with bot and user
     */
    if (!chat) {
      const toType = botId ? (botId === to ? "BOT" : "USER") : "USER";
      const fromType = botId ? (botId === from ? "BOT" : "USER") : "USER";
      chat = await new Chat({
        org: org,
        members: [
          {
            id: to,
            joined_at: body.timestamp,
            show_previous_chat: true,
            userType: toType,
          },
          {
            id: from,
            joined_at: body.timestamp,
            show_previous_chat: true,
            userType: fromType,
          },
        ],
        chatType: type,
        botId: botId,
      }).save();
    }

    /**
     * Saving the message to DB
     */
    messageResponse = await new Message({
      chat: chat,
      from: from,
      to: to,
      payload: message,
      org: org,
    }).save();
    socketMessage(chat, messageResponse._doc || messageResponse);
  } catch (error) {
    console.log("Error", error);
  }
  return messageResponse;
}

export default saveMessage;
