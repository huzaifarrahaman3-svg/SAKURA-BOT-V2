const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "leaveVideo",
    eventType: ["log:unsubscribe"],
    version: "1.0",
    author: "YourName",
    description: "Send local video when someone leaves"
  },

  onEvent: async function ({ api, event }) {
    try {
      if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID())
        return;

      const threadID = event.threadID;

      const videoPath = path.join(__dirname, "cache", "Messenger_creation_EE75524B-DF14-45B8-9A26-4E73C6597769.mp4");

      if (!fs.existsSync(videoPath)) {
        return api.sendMessage("❌ leave video পাওয়া যায়নি!", threadID);
      }

      api.sendMessage({
        body: "😆 একজন গ্রুপ ছেড়ে চলে গেছে!",
        attachment: fs.createReadStream(videoPath)
      }, threadID);

    } catch (err) {
      console.log(err);
    }
  }
};
