const { default: mongoose } = require("mongoose");
import axios from "axios";

const Bot = require("../../models/bot.model");
const Chat = require("../../models/chat.model");
const Message = require("../../models/message.model");
const Flow = require("../../models/flow.model");
const getNextNode = require("./getNextNode");
const sendWhatsappMessage = require("./sendWhatsappMessage");

/**
 * This is a common function for both whatsapp and webchat
 * Any changes in this should cross check with both functionality
 */

async function sendNextMessage(body, type = "WHATSAPP") {
  try {
    /**
     * This array is listed for condition checking
     */
    const STATEMENTS_LIST = [
      "textMessageNode",
      "imageNode",
      "audioNode",
      "videoNode",
      "documentNode",
      "contactNode",
      "linkNode",
      "mapNode",
    ];
    const { botId, org, from, message, chatId } = body;
    const ObjectId = mongoose.Types.ObjectId;

    /**
     * Check if bot exists or not
     * if not exists return
     */
    const bot = await Bot.findOne({
      _id: new ObjectId(botId),
    });
    if (!bot) return {};

    let nextNode, chat;

    /**
     * Getting chat details for flow_nodes & varaible
     */
    if (chatId) {
      chat = await Chat.findOne({
        org: org,
        active: true,
        _id: new ObjectId(chatId),
      });
    } else {
      chat = await Chat.findOne({
        org: org,
        active: true,
        chatType: type,
        $and: [
          { members: { $elemMatch: { id: botId } } },
          { members: { $elemMatch: { id: from } } },
        ],
      });
    }

    if (
      message?.type === "text" &&
      (message?.text?.body === bot.restart_cmd ||
        message?.text?.body === bot.end_cmd)
    ) {
      chat.flow_node = [];
      chat.is_live_chat = false;
      await chat.save();
      if (message?.text?.body === bot.restart_cmd) {
        return await sendNextMessage(
          {
            ...body,
            message: {
              ...message,
              text: { ...message.text, body: bot.restart_cmd + " Restart" },
            },
          },
          type
        );
      } else {
        chat.is_live_chat = true;
        await chat.save();
        return { type: "END" };
      }
    } else if (chat?.is_live_chat) {
      return { type: "LIVE", text: "live chat message sent" };
    }

    /**
     * Getting bot last message for validation checking
     */
    const lastMessages = await Message.find({
      chat: chat._id,
      org: org,
      active: true,
      from: botId,
    })
      .sort({ created_at: -1 })
      .limit(1);

    /**
     * Regex validation if failed sending back same question.
     */
    if (
      lastMessages[0]?.payload?.values?.regex &&
      !message?.text?.body?.match(
        new RegExp(lastMessages[0]?.payload?.values?.regex)
      )
    ) {
      const whatsappResponse = await sendWhatsappMessage({
        type: "validation",
        to: body.from,
        org: org,
        from: botId,
        botId: botId,
        values: lastMessages[0]?.payload?.values,
        variables: chat.variables,
        source_type: type,
        chatId: chatId,
      });
      return whatsappResponse;
    }

    /**
     * Storing variable on chat level
     */
    if (lastMessages[0]?.payload?.values?.variable) {
      let variableName = lastMessages[0]?.payload?.values?.variable;
      let variableValue = message?.text?.body;
      let obj = {};
      obj[`${variableName}`] = variableValue;

      //save variable in chat history
      chat = await Chat.findOneAndUpdate(
        {
          org: org,
          active: true,
          chatType: type,
          $and: [
            { members: { $elemMatch: { id: botId } } },
            { members: { $elemMatch: { id: from } } },
          ],
        },
        {
          $set: { variables: { ...chat.variables, ...obj } },
        },
        { new: true }
      );
    }

    /**
     * the logic of getting into flows and coming back is,
     * we would be storing flow & node id in an array
     * when ever we enter a flow a flow with node will pushed and if flow finshes we will pop it.
     */
    let flow, currentNodeId;
    const is_flow_node_doesnot_exist =
      !chat?.flow_node || (chat?.flow_node && chat?.flow_node?.length === 0);

    /**
     * If flow doesn't exists getting the primary flow id
     * If exists getting the last object in flow_node array
     * and getting flow and node id to get next node.
     */
    if (is_flow_node_doesnot_exist) {
      flow = await Flow.findOne({
        bot: new ObjectId(botId),
        active: true,
        org: org,
        primary: true,
      });
      currentNodeId = null;
    } else if (chat.flow_node && chat.flow_node.length !== 0) {
      flow = await Flow.findOne({
        _id: new ObjectId(chat.flow_node[chat.flow_node.length - 1].flow),
        active: true,
        org: org,
      });
      currentNodeId = chat.flow_node[chat.flow_node.length - 1].node;
    }
    if (!flow) return {};

    /**
     * Based on flow and current node id getting the next node
     */
    nextNode = await getNextNode({
      currentNodeId,
      nodes: flow.nodes,
      edges: flow.edges,
      message: body.message,
    });

    /**
     * If there is no next node and there is only one object in flow_nodes which means that is the last question in bot
     * so we reset the questionare to empty.
     *
     * else if there is no next node but still flow_nodes array has objects then we pop the last element from array
     * (coming out of a flow) and continuing the questions in the flow with recursive loop
     */

    console.log("nextNode", nextNode);
    console.log("chat?.flow_node?.length", chat?.flow_node?.length);

    if (!nextNode && chat?.flow_node?.length === 1) {
      await Chat.updateOne(
        {
          org: org,
          active: true,
          chatType: type,
          $and: [
            { members: { $elemMatch: { id: from } } },
            { members: { $elemMatch: { id: botId } } },
          ],
        },
        {
          $set: {
            flow_node: [],
          },
        },
        { new: true }
      );
      return {};
    } else if (!nextNode && chat?.flow_node?.length > 1) {
      chat = await Chat.findOneAndUpdate(
        {
          org: org,
          active: true,
          chatType: type,
          $and: [
            { members: { $elemMatch: { id: from } } },
            { members: { $elemMatch: { id: botId } } },
          ],
        },
        {
          $pop: { flow_node: 1 },
        },
        { new: true }
      );

      console.log("chat obj", chat);

      return await sendNextMessage({ ...body, message: {} }, type);
    }

    /**
     * Updating the flow_nodes with latest flow id and node id everytime.
     * If flow exists updating the node id
     * If flow doesn't exists push flow and node.
     */
    if (is_flow_node_doesnot_exist) {
      chat = await Chat.findOneAndUpdate(
        {
          _id: new ObjectId(chat._id),
        },
        {
          $set: {
            flow_node: [{ flow: flow._id.toString(), node: nextNode?.id }],
          },
        },
        { new: true }
      );
    } else {
      chat = await Chat.findOneAndUpdate(
        {
          org: org,
          active: true,
          chatType: type,
          "flow_node.flow": flow._id.toString(),
          $and: [
            { members: { $elemMatch: { id: from } } },
            { members: { $elemMatch: { id: botId } } },
          ],
        },
        {
          $set: {
            "flow_node.$": { flow: flow._id.toString(), node: nextNode.id },
          },
        },
        { new: true }
      );
    }

    /**
     * If we encounter a flowNode we will again push the object with flow and node
     * and make a recurisve call
     *
     * else If we encounter a actioNode we will perform api call and continue with the flow
     */

    if (nextNode?.type === "flowNode") {
      let flowId = nextNode.data.values.flowId;

      await Chat.updateOne(
        {
          org: org,
          active: true,
          chatType: type,
          $and: [
            { members: { $elemMatch: { id: from } } },
            { members: { $elemMatch: { id: botId } } },
          ],
        },
        {
          $set: {
            flow_node: [...chat.flow_node, { flow: flowId, node: null }],
          },
        },
        { new: true }
      );
      return await sendNextMessage({ ...body, message: {} }, type);
    } else if (nextNode?.type === "actionNode") {
      let actionNodeData = nextNode?.data?.values;
      const url = replaceWithVariables(
        actionNodeData?.requestUrl,
        chat?.variables
      );
      const method = replaceWithVariables(
        actionNodeData?.requestMethod,
        chat?.variables
      );
      const body = replaceWithVariables(
        actionNodeData?.requestBody,
        chat?.variables
      );
      const headers = replaceWithVariables(
        actionNodeData?.requestHeaders,
        chat?.variables
      );

      try {
        await axios({
          method: method,
          url: url,
          data: JSON.parse(body),
          headers: {
            ...JSON.parse(headers),
          },
        });
      } catch (error) {
        console.log("ERR in ActionNide", error);
        return {};
      }
      return await sendNextMessage({ ...body, message: {} }, type);
    } else if (nextNode?.type === "liveChatNode") {
      chat.is_live_chat = true;
      await chat.save();
      return {
        type: "liveChat",
        liveChat: {
          body: "Started",
        },
      };
    }

    /**
     * Send message to whats app.
     */
    const whatsappResponse = await sendWhatsappMessage({
      type: nextNode.type,
      to: body.from,
      values: nextNode?.data?.values,
      org: org,
      from: botId,
      botId: botId,
      variables: chat.variables,
      source_type: type,
      chatId: chatId,
    });

    /**
     * Make a recurisve call if the node belongs to a statement type node
     */
    if (STATEMENTS_LIST.includes(nextNode.type) && type === "WHATSAPP") {
      return await new Promise((resolve) =>
        setTimeout(async () => {
          await sendNextMessage({ ...body, message: {} }, type);
          resolve;
        }, 1500)
      );
    } else {
      return whatsappResponse;
    }
  } catch (error) {
    console.log("Send Next Message Err: ", error);
    return {};
  }
}

function replaceWithVariables(msg, variables) {
  if (variables) {
    Object.keys(variables).forEach((key) => {
      msg = msg.replace(`{{${key}}}`, variables?.[`${key}`]);
    });
  }
  return msg;
}

export default sendNextMessage;
