const axios = require("axios");
const fs = require("fs");
const path = require("path");

const apiJsonUrl = "https://raw.githubusercontent.com/goatbotnx/Sexy-nx2.0Updated/refs/heads/main/nx-apis.json"; 
const ADMIN_UID = "100053752213996";

module.exports = {
  config: {
    name: "album",
    aliases: ["gallery", "alb"],
    version: "7.0",
    author: "xalman", 
    role: 0,
    category: "media",
    shortDescription: "🌸 Dynamic Album with Auto-Unsend",
    guide: "{p}album [page]"
  },

  onStart: async function ({ message, event, args }) {
    try {
      const apiListResponse = await axios.get(apiJsonUrl);
      const BASE_API = apiListResponse.data.album;

      const catRes = await axios.get(`${BASE_API}/categories`);
      const allCategories = catRes.data.categories;

      if (!allCategories || allCategories.length === 0) {
        return message.reply("⚠️ No categories found in API.");
      }

      const itemsPerPage = 8;
      const totalPages = Math.ceil(allCategories.length / itemsPerPage);
      let page = parseInt(args[0]) || 1;

      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;

      const startIndex = (page - 1) * itemsPerPage;
      const currentPageCategories = allCategories.slice(startIndex, startIndex + itemsPerPage);

      const fancy = (t) => t.replace(/[a-z]/g, c => String.fromCodePoint(0x1d400 + c.charCodeAt(0) - 97));
      const numStyle = (n) => String(n).replace(/[0-9]/g, d => String.fromCodePoint(0x1d7ec + Number(d)));

      let menuText = `𝐀𝐯𝐚𝐢𝐥𝐚𝐛𝐥𝐞 𝐀𝐥𝐛𝐮𝐦 𝐕𝐢𝐝𝐞𝐨\n𐙚━━━━━━━━━━━━━━━━━━━━━ᡣ𐭩\n`;
      currentPageCategories.forEach((cat, index) => {
        menuText += ` ${numStyle(index + 1)} ┊ ${fancy(cat)} 𝐕𝐈𝐃𝐄𝐎 🎀\n`;
      });
      menuText += `𐙚━━━━━━━━━━━━━━━━━━━━━ᡣ𐭩\n`;
      menuText += `♻ | 𝐏𝐚𝐠𝐞 ${numStyle(page)} / ${numStyle(totalPages)}\n`;
      
      if (page < totalPages) {
        menuText += `𝐓𝐲𝐩𝐞 !album ${page + 1} 𝐭𝐨 𝐬𝐞𝐞 𝐧𝐞𝐱𝐭 𝐩𝐚𝐠𝐞`;
      } else if (totalPages > 1) {
        menuText += `↩️ 𝐓𝐲𝐩𝐞 !album 1 to return to start`;
      }

      return message.reply(menuText, (err, info) => {
        // ৬০ সেকেন্ড পর অটো আনসেন্ড করার টাইমার
        setTimeout(() => {
            message.unsend(info.messageID);
        }, 60000);

        global.GoatBot.onReply.set(info.messageID, {
          commandName: "album",
          author: event.senderID,
          categories: currentPageCategories,
          BASE_API: BASE_API,
          messageID: info.messageID
        });
      });

    } catch (err) {
      console.error(err);
      return message.reply("⚠️ Connection error! Please check if your API is online.");
    }
  },

  onReply: async function ({ message, event, Reply }) {
    const { author, categories, BASE_API, messageID } = Reply;
    if (event.senderID !== author) return message.reply("⛔ This menu is not for you.");

    const pick = parseInt(event.body);
    if (isNaN(pick)) return message.reply("🔢 Please reply with a valid number.");
    if (pick < 1 || pick > categories.length) return message.reply("❌ Invalid selection.");

    // ইউজার রিপ্লাই দেওয়ার সাথে সাথে লিস্টটি আনসেন্ড করে দেওয়া
    message.unsend(messageID);

    const category = categories[pick - 1];
    const restricted = ["hot", "horny"];
    
    if (restricted.includes(category.toLowerCase()) && event.senderID !== ADMIN_UID) {
        return message.reply("ছি তুমি এখনো ভালো হলে না 🫢🙏");
    }

    try {
      message.reply(``);

      const res = await axios.get(`${BASE_API}/album?type=${category}`);
      const mediaUrl = res.data.data;

      if (!mediaUrl) return message.reply("❌ No content found for this category.");

      const ext = mediaUrl.split(".").pop().split("?")[0] || "mp4";
      const filePath = path.join(__dirname, "cache", `album_${Date.now()}.${ext}`);

      const response = await axios({ url: mediaUrl, method: 'GET', responseType: 'stream' });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      writer.on("finish", () => {
        message.reply({
          body: `𝐇𝐞𝐫𝐞'𝐬 𝐲𝐨𝐮𝐫 ${category} 𝐕𝐢𝐝𝐞𝐨 <😘`,
          attachment: fs.createReadStream(filePath)
        }, () => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
      });
    } catch (err) {
      message.reply("⚠️ Failed to download or send media.");
    }
  }
};
