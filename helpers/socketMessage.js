import axios from "axios";

async function socketMessage(chat, message) {
  const memberResponse = await axios.get(
    `https://ctfcaawanh.execute-api.ap-south-1.amazonaws.com/fetch?org=${chat.org}&user_type=STAFF`
  );
  const members = memberResponse.data.map((obj) => obj.userId);

  const uniqueIds = [...new Set(members)];
  const payload = {
    action: "message",
    type: "NEW_MESSAGE",
    payload: { ...message, chatId: chat._id },
    sender: "API",
    org: chat.org,
    members_list: [...uniqueIds],
  };
  try {
    const response = await axios.post(
      `https://ctfcaawanh.execute-api.ap-south-1.amazonaws.com/send`,
      payload
    );
  } catch (error) {
    console.log("Err: ", error);
  }

  return;
}

export default socketMessage;
