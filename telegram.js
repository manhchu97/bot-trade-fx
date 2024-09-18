require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const Net = require("net");
const client_cmd = new Net.Socket();
const volume = 0.02;
function parseTradeMessage(text) {
  const lines = text.split("\n").filter((item) => item);

  if (lines.length < 3) {
    return { error: "Sai cú pháp: Tin nhắn không đầy đủ thông tin." };
  }

  const tpRegex = /tp (\d+(\.\d+)?)/i;
  const slRegex = /sl (\d+(\.\d+)?)/i;
  const code = lines[0];
  const sellBuyLine = lines[1];
  const entryPointRegex = /(sell|buy) (\d+(\.\d+)?)/i;
  const matchEntry = sellBuyLine.match(entryPointRegex);
  if (!matchEntry) {
    return {
      error:
        'Sai cú pháp: Cần có thông tin "Sell" hoặc "Buy" và điểm vào lệnh.',
    };
  }

  const type = matchEntry[1].toLowerCase();
  let tps = [];
  let sl = null;

  lines.forEach((line) => {
    const tpMatch = line.match(tpRegex);
    if (tpMatch) {
      tps.push(tpMatch[1]);
    }

    const slMatch = line.match(slRegex);
    if (slMatch) {
      sl = slMatch[1];
    }
  });

  if (tps.length === 0) {
    return { error: "Sai cú pháp: Cần có ít nhất một giá trị Tp." };
  }

  const result = [];
  for (const tp of tps) {
    const data = {
      MSG: "ORDER_SEND",
      SYMBOL: code.toUpperCase(),
      VOLUME: volume,
      TYPE: `ORDER_TYPE_${type.toUpperCase()}`,
      TP: tp,
    };

    if (sl) {
      data.SL = sl;
    }
    result.push(data);
  }

  return {
    data: result,
  };
}

const sendOrders = (orders, callback) => {
  const client_cmd = new Net.Socket();
  client_cmd.connect(77, "localhost", function () {
    let completed = 0;
    console.log("Connect to server MTSocketApi !");
    orders.forEach((order) => {
      const message = JSON.stringify(order) + "\r\n";
      client_cmd.write(message);
    });
  });

  client_cmd.on("data", function (chunk) {
    completed++;
    // Nếu đã nhận tất cả phản hồi
    if (completed === orders.length) {
      client_cmd.end();
      callback({
        isSuccess: true,
      });
    }
  });

  client_cmd.on("error", function (error) {
    console.error("Socket error:", error);
    callback({
      isSuccess: false,
      msg: "Không thể connect được socket !",
    });
  });
};

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const orders = parseTradeMessage(text);
  if (orders.error) {
    bot.sendMessage(chatId, `Lỗi: ${orders.error}`);
  } else {
    sendOrders(orders, (responses) => {
      if (!responses.isSuccess) {
        return bot.sendMessage(chatId, responses.msg);
      }
    });
  }
});

module.exports = bot;
