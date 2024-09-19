require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const Net = require("net");
const dayjs = require('dayjs')
const fs = require('fs')
function parseTradeMessage(text) {
  const lines = text.split("\n").filter((item) => item);
  const settings = require('./settings.json')
  const pairRegex = /PAIR:\s*#(\w+)/i;
  const typeRegex = /TYPE:\s+(\w+)/i;
  const slRegex = /🔻\s*SL:\s+([\d.]+)/i;
  const entryRegex = /🔹ENTRY:\s*(.+)/i;

  let pair = null;
  let type = null;
  let sl = null;
  let entryPrices = [];

  lines.forEach((line) => {
    // Tìm và lưu cặp giao dịch (PAIR)
    const pairMatch = line.match(pairRegex);
    if (pairMatch) {
      pair = pairMatch[1].toUpperCase();
    }

    // Tìm và lưu loại giao dịch (TYPE)
    const typeMatch = line.match(typeRegex);
    if (typeMatch) {
      type = typeMatch[1].toUpperCase();
    }

    // Tìm và lưu giá trị SL
    const slMatch = line.match(slRegex);
    if (slMatch) {
      sl = parseFloat(slMatch[1]);
    }

    // Tìm và lưu các giá trị ENTRY
    const entryMatch = line.match(entryRegex);
    if (entryMatch) {
      // Thay thế "🔹ENTRY: " và nối các giá trị lại với nhau
      entryPrices = entryMatch[1].trim().split(" ").map(price => parseFloat(price));
      entryPrices = entryPrices.filter(entry=>{
        if(entry !== 'NaN' || entry !== NaN) return entry
      })
    }
  });

  // Kiểm tra xem có đủ thông tin hay khôngs
  if (!pair || !type || entryPrices.length === 0) {
    return { error: "Sai cú pháp: Cần có thông tin đầy đủ." };
  }


  const result = entryPrices.map(price => ({
    MSG: "ORDER_SEND",
    SYMBOL: pair,
    VOLUME: parseFloat(settings.volume),
    TYPE: `ORDER_TYPE_${type}_LIMIT`,
    PRICE: price,
    EXPIRATION: dayjs().add(1, 'day').format('YYYY.MM.DD HH:mm:ss'),
    SL: sl
  }));

  return {
    data: result
  };
}

const sendOrder = (order) => {
  return new Promise((resolve, reject) => {
    const client_cmd = new Net.Socket();

    client_cmd.connect(77, "localhost", function () {
      const message = JSON.stringify(order) + "\r\n";
      client_cmd.write(message);
    });

    client_cmd.on("data", function (chunk) {
      client_cmd.end(); // Đóng socket sau khi nhận dữ liệu
      resolve(JSON.parse(chunk.toString())); // Gọi resolve khi hoàn thành
    });

    client_cmd.on("error", function (error) {
      console.error("Socket error:", error);
      client_cmd.end();
      reject(error); // Gọi reject khi có lỗi
    });
  });
};

const sendOrders = async (orders, chatId, callback) => {
  console.log(orders);
  try {
    for (const order of orders) {
      const res = await sendOrder(order);
      const statusMessage = res?.ERROR_ID === 0 ? '✅ SUCCESSED' : '❌ FAILED';
      const formattedMessage = `
      PAIR:   #${order.SYMBOL}
      TYPE:   ${order.TYPE}
      🔹 ENTRY:  ${order.PRICE}
      🔻 SL:    ${order.SL}
      VOLUME:   ${order.VOLUME}
      STATUS:  ${statusMessage}
      `;

      await bot.sendMessage(chatId, formattedMessage);
    }
    callback({
      isSuccess: true,
    });
  } catch (error) {
    callback({
      isSuccess: false,
      msg: "Có lỗi xảy ra khi gửi đơn hàng!",
    });
  }
};

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (text.startsWith('/volume')) {
    const regex = /\/volume (\d+(\.\d+)?)/;
    const match = text.match(regex);
    if (match) {
      const volume = +match[1];
      fs.writeFileSync('./settings.json', JSON.stringify({ volume }))
      return true
    } else {
      return bot.sendMessage(chatId, 'Bạn cần nhập volume !');
    }
  }

  else {
    const orders = parseTradeMessage(text);
    if (orders.error) {
      bot.sendMessage(chatId, `Lỗi: ${orders.error}`);
    } else {
      sendOrders(orders.data, chatId, (responses) => {
        if (!responses.isSuccess) {
          return bot.sendMessage(chatId, responses.msg);
        }
      });
    }
  }
});

module.exports = bot;
