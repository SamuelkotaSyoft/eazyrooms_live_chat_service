import express from "express";
import axios from "axios";

import Chat from "../../models/chat.model";
import IP from "../../models/ip.model";
// import { connectToMongoDB } from "../db";

var router = express.Router();

router.post("/", async (req, res) => {
  try {
    const now = new Date();
    const utcTime = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    );

    await connectToMongoDB();

    const { org, botId } = req.body;
    console.log("IP", req.ip);
    const userIP = req.headers["x-forwarded-for"] || req.ip;
    const { data } = await ipDetails(userIP);

    console.log("data", data);

    const toType = "BOT";
    const fromType = "USER";

    const from = generateRandomAlphaNumeric();
    const to = botId;

    let chat = await new Chat({
      org: org,
      members: [
        {
          id: to,
          joined_at: utcTime,
          show_previous_chat: true,
          userType: toType,
        },
        {
          id: from,
          joined_at: utcTime,
          show_previous_chat: true,
          userType: fromType,
        },
      ],
      chatType: "LIVECHAT",
      botId: botId,
      info: {
        userIP: userIP,
        metrics: data,
      },
    }).save();

    res.status(200).json({
      status: 200,
      message: "chat created successfully",
      data: chat,
      userId: from,
    });
  } catch (error) {
    console.log("Err: ", error);
    res
      .status(400)
      .json({ status: 400, message: "invalid payload sent", data: [] });
  }
});

function generateRandomAlphaNumeric() {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}

async function ipDetails(ipAddress) {
  try {
    let ipData;
    ipData = await IP.findOne({
      ip: ipAddress,
    });

    if (ipData) {
      return ipData;
    } else {
      let ipResponse;
      try {
        ipResponse = await axios.get(`http://ip-api.com/json/${ipAddress}`);
      } catch (error) {
        ipResponse = { data: {} };
      }

      ipData = new IP({
        ip: ipAddress,
        data: ipResponse.data,
      });

      return ipData;
    }
  } catch (error) {
    return { ip: ipAddress, data: {} };
  }
}

export default router;
