const fs = require("fs");
const path = require("path");
const axios = require("axios"); // npm i axios

// Permanent data storage
const dataPath = path.join(__dirname, "wordgame_data.json");
if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(dataPath, JSON.stringify({ leaderboard: {}, balance: {} }, null, 2));
}

// Active games memory
let chainGames = [];

// Small word list for starting first word
const wordsList = ["apple","elephant","tree","rabbit","tiger","rose","egg","grape","lion","mango","table","ear","panther","top","pot","lemon","nose","snake","kangaroo","orange"];

// Load / Save
function getData() {
  return JSON.parse(fs.readFileSync(dataPath));
}
function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// Online dictionary validation
async function isValidWord(word) {
  try {
    const res = await axios.get(`https://api.datamuse.com/words?sp=${word}&max=1`);
    return res.data.length > 0;
  } catch (err) {
    console.error("API error:", err);
    return false; // consider invalid if API fails
  }
}

module.exports = {
  config: {
    name: "wordgame",
    aliases: ["wc","wordchain"],
    version: "2.0",
    author: "ChatGPT",
    countDown: 5,
    role: 0,
    shortDescription: "Word Chain Multiplayer Game (All-time leaderboard)",
    category: "game"
  },

  onStart: async function({ api, event, args }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const data = getData();

    // Help
    if (args[0] === "help") {
      return api.sendMessage(
        `🎮 WORD CHAIN HELP\n
🟢 Start: !wordchain / !wc
🛑 Stop: !wc stop
🏆 Leaderboard: !wc leaderboard
💰 Balance: !wc balance
Rules: Next word starts with last letter, no repeats, invalid → lose 1 attempt
Attempts: 5 per game
`,
        threadID
      );
    }

    // Stop Game
    if (args[0] === "stop") {
      if (!chainGames[threadID]) return api.sendMessage("❌ No game running!", threadID);
      delete chainGames[threadID];
      return api.sendMessage("🛑 Game stopped!", threadID);
    }

    // Leaderboard
    if (args[0] === "leaderboard") {
      const sorted = Object.entries(data.leaderboard).sort((a,b)=>b[1]-a[1]).slice(0,10);
      if (!sorted.length) return api.sendMessage("📭 No leaderboard yet!", threadID);
      let msg = "🏆 ALL-TIME LEADERBOARD\n\n";
      sorted.forEach((u,i)=>msg+=`${i+1}. ${u[0]} ➜ ${u[1]} wins\n`);
      return api.sendMessage(msg, threadID);
    }

    // Balance
    if (args[0] === "balance") {
      const bal = data.balance[senderID] || 0;
      return api.sendMessage(`💰 Your Balance: ${bal}`, threadID);
    }

    // Check if game running
    if (chainGames[threadID]) return api.sendMessage("⚠️ Game already running!", threadID);

    // Start new game
    const firstWord = wordsList[Math.floor(Math.random()*wordsList.length)];
    chainGames[threadID] = {
      currentWord: firstWord,
      usedWords: [firstWord],
      attempts: 5
    };

    return api.sendMessage(
      `🎮 WORD CHAIN GAME STARTED!\n🟢 First Word: ${firstWord}\n💥 Attempts: 5\nRules: Next word starts with last letter, no repeats.\nType your word!`,
      threadID
    );
  },

  onChat: async function({ api, event }) {
    const threadID = event.threadID;
    const playerID = event.senderID;
    const msg = event.body?.toLowerCase();
    const data = getData();

    if (!chainGames[threadID] || !msg) return;
    const game = chainGames[threadID];
    const prevWord = game.currentWord;

    // Online dictionary check
    const valid = await isValidWord(msg);
    if (!valid) {
      game.attempts--;
      if (game.attempts <= 0) { delete chainGames[threadID]; return api.sendMessage(`💀 Game Over! Last Word: ${prevWord}`, threadID); }
      return api.sendMessage(`❌ Invalid English word! Attempts left: ${game.attempts}`, threadID);
    }

    if (game.usedWords.includes(msg)) {
      game.attempts--;
      if (game.attempts <= 0) { delete chainGames[threadID]; return api.sendMessage(`💀 Game Over! Last Word: ${prevWord}`, threadID); }
      return api.sendMessage(`❌ Word already used! Attempts left: ${game.attempts}`, threadID);
    }

    if (msg[0] !== prevWord[prevWord.length-1]) {
      game.attempts--;
      if (game.attempts <= 0) { delete chainGames[threadID]; return api.sendMessage(`💀 Game Over! Last Word: ${prevWord}`, threadID); }
      return api.sendMessage(`❌ Word must start with "${prevWord[prevWord.length-1]}"! Attempts left: ${game.attempts}`, threadID);
    }

    // Valid guess → update game
    game.currentWord = msg;
    game.usedWords.push(msg);

    if (!data.balance[playerID]) data.balance[playerID]=0;
    if (!data.leaderboard[playerID]) data.leaderboard[playerID]=0;

    data.balance[playerID]+=1000;
    data.leaderboard[playerID]+=1;
    saveData(data);

    return api.sendMessage(
      `✅ Good job!\nNext Word: "${msg}"\n💰 +1000 balance\n💥 Attempts left: ${game.attempts}`,
      threadID
    );
  }
};
