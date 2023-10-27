import express from "express";
import { v4 as uuidv4 } from "uuid";
import saveChatHistory from "../helpers/saveChatHistory.js";
import sendWhatsAppMessage from "../helpers/sendWhatsAppMessage.js";
import verifyToken from "../helpers/verifyToken.js";
import User from "../models/userModel.js";
import { emitNewMessage } from "../sockets/socket-io.js";

var router = express.Router();

export default router.post("/", verifyToken, async function (req, res) {
  /**
   *
   *
   * payload
   *
   */
  const uid = req.user_info.main_uid;
  const phoneNumber = req.body.phoneNumber;
  const message = req.body.message;
  const locationId = req.body.locationId;
  const media = req.body.media;

  console.log({ uid });
  console.log({ locationId });

  try {
    /**
     *
     * get user by uid
     */
    const user = await User.findOne({ uid: uid });
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    /**
     *
     * send whats app message
     */
    await sendWhatsAppMessage({
      locationId: locationId,
      phoneNumber: phoneNumber,
      message: message,
      media: media,
      messageType: (() => {
        if (media && media.type === "image") {
          return "imageNode";
        }
        if (media && media.type === "video") {
          return "videoNode";
        }
        if (media && media.type === "audio") {
          return "audioNode";
        }
        return "textMessageNode";
      })(),
    });

    /**
     *
     * save chat history
     */
    await saveChatHistory({
      locationId: locationId,
      chatId: phoneNumber,
      source: "whatsapp",
      message: {
        from: uid,
        id: uuidv4(),
        type: (() => {
          if (media && media.type === "image") {
            return "imageNode";
          }
          if (media && media.type === "video") {
            return "videoNode";
          }
          if (media && media.type === "audio") {
            return "audioNode";
          }
          return "textMessageNode";
        })(),
        message: message,
        media: media,
        timestamp: Date.now(),
      },
    });

    /**
     *
     * emit new message event to client
     */
    emitNewMessage({
      roomId: locationId,
      key: "NEW_MESSAGE",
      message: "",
    });

    /**
     *
     * send response to webhook
     */
    res.status(200).json({ status: true });
  } catch (err) {
    /**
     *
     * log any errors
     */

    res.status(500).json({ status: false, err: err });
  }
});
