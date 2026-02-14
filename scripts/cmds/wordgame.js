const fs = require("fs");
const path = require("path");

// JSON data file
const dataPath = path.join(__dirname, "wordgame_data.json");
if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(dataPath, JSON.stringify({ leaderboard: {}, balance: {} }, null, 2));
}

// In-memory active games
let chainGames = [];

// Word list
const wordsList = [
  "apple","elephant","tree","ear","rabbit","tiger","rose","egg",
  "grape","eagle","lion","night","top","pot","tomato","orange","eggplant",
  "tulip","panther","rat","table","lemon","nose","snake","kangaroo"
];

// Load/Save functions
function getData() {
  return JSON.parse(fs.readFileSync(dataPath));
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// Export module
module.exports = {
  config: {
    name: "wordgame",
    aliases: ["wc", "wordchain"],
    version: "1.0",
    author: "ChatGPT",
    countDown: 5,
    role: 0,
    shortDescription: "Word Chain Multiplayer Game",
    category: "game"
  },

  // Start game / handle commands
  onStart: async function({ api, event, args }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const data = getData();

    // Help Command
    if (args[0] === "help") {
      const msg = `🎮 WORD CHAIN GAME HELP MENU

🟢 Start Game:
!wordchain
!wc
➡️ Start a new Word Chain game.

🛑 Stop Game:
!wc stop
➡️ Stop the running game.

🏆 Leaderboard:
!wc leaderboard
➡️ Show top players.

💰 Balance Check:
!wc balance
➡️ Check your balance.

📜 Rules:
1️⃣ Next word must start with last letter of previous word.
2️⃣ No repeating words.
3️⃣ Wrong/invalid word → lose 1 attempt.
4️⃣ Attempts reach 0 → Game Over.
5️⃣ Multiplayer: Everyone can guess.

💡 Tips:
- Think fast, last letter is important!
- Guess uncommon words to block others.
- Chain length → bonus reward.

🔥 Future:
!wc hard | !wc easy | !wc category | !wc stats | !wc daily`;
      return api.sendMessage(msg, threadID);
    }

    // Stop Game
    if (args[0] === "stop") {
      if (!chainGames[threadID]) return api.sendMessage("❌ No game running!", threadID);
      delete chainGames[threadID];
      return api.sendMessage("🛑 Game stopped!", threadID);
    }

    // Leaderboard
    if (args[0] === "leaderboard") {
      const sorted = Object.entries(data.leaderboard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      if (!sorted.length) return api.sendMessage("📭 No leaderboard yet!", threadID);

      let msg = "🏆 TOP 10 LEADERBOARD\n\n";
      sorted.forEach((item, i) => {
        msg += `${i + 1}. ${item[0]} ➜ ${item[1]} wins\n`;
      });
      return api.sendMessage(msg, threadID);
    }

    // Balance
    if (args[0] === "balance") {
      const bal = data.balance[senderID] || 0;
      return api.sendMessage(`💰 Your Balance: ${bal}`, threadID);
    }

    // Check if game already running
    if (chainGames[threadID]) return api.sendMessage("⚠️ Game already running!", threadID);

    // Start new Word Chain Game
    const firstWord = wordsList[Math.floor(Math.random() * wordsList.length)];
    chainGames[threadID] = {
      currentWord: firstWord,
      usedWords: [firstWord],
      attempts: 5
    };

    return api.sendMessage(
      `🎮 WORD CHAIN GAME STARTED!\n\n` +
      `🟢 First Word: ${firstWord}\n` +
      `Rules:\n1️⃣ Next word must start with last letter of previous word.\n2️⃣ No repeating words.\n3️⃣ Wrong/invalid → lose attempt.\n` +
      `💥 Attempts: 5\n\nType your word to continue the chain.`,
      threadID
    );
  },

  // Handle user guesses
  onChat: async function({ api, event }) {
    const threadID = event.threadID;
    const playerID = event.senderID;
    const msg = event.body?.toLowerCase();
    const data = getData();

    if (!chainGames[threadID]) return;
    if (!msg) return;

    const game = chainGames[threadID];
    const prevWord = game.currentWord;

    // Word validation
    if (!wordsList.includes(msg)) {
      game.attempts--;
      if (game.attempts <= 0) {
        delete chainGames[threadID];
        return api.sendMessage(`💀 Game Over! Last Word: ${prevWord}`, threadID);
      }
      return api.sendMessage(`❌ Invalid word! Attempts left: ${game.attempts}`, threadID);
    }

    if (game.usedWords.includes(msg)) {
      game.attempts--;
      if (game.attempts <= 0) {
        delete chainGames[threadID];
        return api.sendMessage(`💀 Game Over! Last Word: ${prevWord}`, threadID);
      }
      return api.sendMessage(`❌ Word already used! Attempts left: ${game.attempts}`, threadID);
    }

    if (msg[0] !== prevWord[prevWord.length - 1]) {
      game.attempts--;
      if (game.attempts <= 0) {
        delete chainGames[threadID];
        return api.sendMessage(`💀 Game Over! Last Word: ${prevWord}`, threadID);
      }
      return api.sendMessage(`❌ Word must start with "${prevWord[prevWord.length - 1]}"! Attempts left: ${game.attempts}`, threadID);
    }

    // Valid guess → update game
    game.currentWord = msg;
    game.usedWords.push(msg);

    // Reward player
    if (!data.balance[playerID]) data.balance[playerID] = 0;
    if (!data.leaderboard[playerID]) data.leaderboard[playerID] = 0;
    data.balance[playerID] += 1000; // reward per correct word
    data.leaderboard[playerID] += 1; 
    saveData(data);

    return api.sendMessage(
      `✅ Good job!\nNext Word: "${msg}"\n💰 +1000 balance\n💥 Attempts left: ${game.attempts}`,
      threadID
    );
  }
};
