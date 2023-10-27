import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import path from "path";
import "./firebase-config.js";

const app = express();
const port = 3011;

app.use(cors());
app.use(express.json());

/**socket io */
import http from "http";
import { socketConnection } from "./sockets/socket-io.js";
const server = http.createServer(app);
socketConnection(server);

/**
 *
 * dotenv config
 */
const __dirname = path.resolve();
dotenv.config({
  path: path.resolve(__dirname, ".env"),
});

/**
 *
 * connect to mongodb
 */
await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
console.log("MONGODB CONNECTED...");

/**
 *
 * routes
 */

app.use(
  "/replyToWhatsAppUser",
  (await import("./routes/replyToWhatsAppUser.js")).default
);

/**
 *
 * start listening to requests
 */
server.listen(port, () => {
  console.log(`Chatbot service listening on port ${port}`);
});

app.get("/", (req, res) => {
  res.status(200).json({ status: "OK", service: "Live Chat Service" });
});
