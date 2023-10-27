import express from "express";
import mongoose from "mongoose";
import Message from "../models/message.model.js";
import Chat from "../models/chat.model.js";
import verifyToken from "../helpers/verifyToken.js";
import saveMessage from "../helpers/whatsapp/saveChat";
import sendWhatsappMessage from "../helpers/whatsapp/sendWhatsappMessage.js";
var router = express.Router();

router.get("/:chatId", verifyToken, async (req, res) => {
  const ObjectId = mongoose.Types.ObjectId;

  const { org } = req.user;
  const { chatId } = req.params;
  const { page = 1, offset = 20 } = req.query;

  const totalDocuments = await Message.countDocuments({
    chat: new ObjectId(chatId),
    org: org,
    active: true,
  });
  const totalPages = Math.ceil(totalDocuments / offset);

  const skip = (page - 1) * offset;
  const messages = await Message.find({
    chat: new ObjectId(chatId),
    org: org,
    active: true,
  })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(offset);

  // await disconnectFromMongoDB();

  return res.status(200).json({
    status: 200,
    message: "Chat Messages",
    data: messages,
    pages: totalPages,
    count: totalDocuments,
  });
});

router.post("/:chatId", verifyToken, async (req, res) => {
  try {
    const ObjectId = mongoose.Types.ObjectId;

    const { id, org } = req.user;
    const { message, type, media, to, source_type } = req.body;
    const { chatId } = req.params;

    // await connectToMongoDB();

    const message_payload = {
      type: type,
      media: media,
      text: {
        body: message,
      },
    };

    const checkChat = await Chat.findOne({
      _id: new ObjectId(chatId),
      org: org,
      active: true,
    });

    if (!checkChat)
      return res
        .status(400)
        .json({ status: 400, message: "Invalid Payload Send", data: [] });

    const messageResponse = await saveMessage({
      org,
      from: id,
      to: to,
      chatId: chatId,
      message: message_payload,
    });

    if (source_type === "WHATSAPP") {
      const values = {
        media: media,
        message: message,
      };

      await sendWhatsappMessage({
        type: type === "text" ? "textMessageNode" : type + "Node",
        to: to,
        values: values,
        org: org,
        from: id,
        saveChat: false,
        botId: null,
      });
    }
    res.status(200).json({
      status: 200,
      message: "message send successfully",
      data: messageResponse,
    });
  } catch (error) {
    console.log("Error", error);
    res.status(400).json({ status: 400, message: "Invalid Payload", data: [] });
  }
});

export default router;
