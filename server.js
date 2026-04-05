require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const path         = require('path');
const { v4: uuidv4 } = require('uuid');
const Database     = require('better-sqlite3');
const TelegramBot  = require('node-telegram-bot-api'); 
const fs           = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// SIZNING YANGI BOT TOKENINGIZ VA ID RAQAMINGIZ
const BOT_TOKEN = '8750450645:AAGuiHZ3ApX40jQfBeglqv3sIZHGeb5vhQw';
const ADMIN_CHAT_ID = '6612990282'; 

// OBUNA (ABONEMENT) MUDDATINI TEKSHIRISH
const EXPIRATION_DATE = process.env.EXPIRATION_DATE || '2099-12-31';

function isExpired() {
  const now = new Date();
  const expDate = new Date(EXPIRATION_DATE);
  return now > expDate;
}

// Botni xatoliklarga chidamli qilib ishga tushirish
const bot = new TelegramBot(BOT_TOKEN, { 
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  } 
});

bot.on('polling_error', (error) => {
  console.log('Bot polling error:', error.message);
});

// BOTGA /start BOSILGANDA
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  if (isExpired()) {
    bot.sendMessage(chatId, "⚠️ Kechirasiz, mehmonxona tizimi vaqtincha to'xtatilgan (Texnik xizmat). Dasturchi bilan bog'laning.");
    return;
  }

  const welcomeText = `
✨ <b>Old Tashkent Hotel & Spa'ga Xush kelibsiz!</b>

Mijozlarga yuqori darajadagi qulaylik va beqiyos mehmondo'stlikni taqdim etamiz.
Xonalarni ko'rish va band qilish uchun quyidagi tugmani bosing 👇
  `;
  const opts = {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        // SIZNING YANGI GITHUB REPOZITORIYANGIZGA MOSLANGAN WEB APP LINKI
        [{ text: "🏨 Xona Band Qilish", web_app: { url: "https://myoldoshev057-arch.github.io/oldtashkenthotel" } }]
      ]
    }
  };
  bot.sendMessage(chatId, welcomeText, opts);
});

// ADMIN TUGMALARI
bot.on('callback_query', (query) => {
  const action = query.data;
  const chatId = query.message.chat.id;
  
  if(action.startsWith('confirm_')) {
    bot.editMessageText("✅ Bron muvaffaqiyatli TASDIQLANDI.", { chat_id: chatId, message_id: query.message.message_id });
  } else if(action.startsWith('cancel_')) {
    bot.editMessageText("❌ Bron BEKOR QILINDI.", { chat_id: chatId, message_id: query.message.message_id });
  }
});

// ── Database ─────────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || './db/aurum.sqlite';
const dbDir   = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

try { db.exec(`ALTER TABLE bookings ADD COLUMN payment_type TEXT DEFAULT 'joyida';`); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, tg_id TEXT, first_name TEXT, 
    phone TEXT, check_in TEXT, check_out TEXT, room_type TEXT, 
    adults INTEGER DEFAULT 1, children INTEGER DEFAULT 0, trip_type TEXT,
    payment_type TEXT DEFAULT 'joyida', special_requests TEXT, 
    status TEXT DEFAULT 'pending', total_price REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

app.use(helmet());
app.use(cors({ origin: '*', credentials: true })); 
app.use(express.json());

// OLD TASHKENT XONALARI VA NARXLARI
const ROOM_PRICES = { standart_double: 50, superior_triple: 70, deluxe_family: 90, double_suite: 120 };
const ROOM_NAMES  = { standart_double: 'Standart Double Xona', superior_triple: 'Superior Triple Xona', deluxe_family: 'Deluxe Family Xona', double_suite: 'Double Suite Xona' };

function calcNights(checkIn, checkOut) {
  const ms = new Date(checkOut) - new Date(checkIn);
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

async function handleNewBooking(booking, rawData) {
  const nights = calcNights(booking.check_in, booking.check_out);
  const roomName = ROOM_NAMES[booking.room_type] || booking.room_type;
  
  const avansSumma = (booking.total_price * 0.1).toFixed(2);
  const paymentText = rawData.payment_type === 'avans' 
    ? `🟡 <b>10% AVANS KARTA ORQALI</b> ($${avansSumma} ni tekshiring!)` 
    : `🏨 <b>Joyida to'lash</b>`;

  const adminMsg = `
🔔 <b>YANGI BRON — OLD TASHKENT</b>

👤 <b>Mijoz:</b> ${booking.first_name}
📞 <b>Tel:</b> ${booking.phone}
🛏 <b>Xona:</b> ${roomName}
📅 <b>Sana:</b> ${booking.check_in} ➡️ ${booking.check_out} (${nights} kecha)

👥 <b>Mehmonlar:</b> ${rawData.adults} ta katta, ${rawData.children} ta bola
🎯 <b>Safar turi:</b> ${rawData.trip_type}
💳 <b>To'lov usuli:</b> ${paymentText}
📝 <b>Istak:</b> ${booking.special_requests || "Yo'q"}

💰 <b>Jami summa:</b> $${booking.total_price}
  `;
  
  const opts = {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Tasdiqlash", callback_data: `confirm_${booking.id}` }, { text: "❌ Bekor qilish", callback_data: `cancel_${booking.id}` }]
      ]
    }
  };
  
  try {
    await bot.sendMessage(ADMIN_CHAT_ID, adminMsg, opts);
  } catch (e) { console.error("Adminga xabar yuborishda xato:", e.message); }

  if (booking.tg_id) {
    const clientMsg = `Hurmatli <b>${booking.first_name}</b>, sizning <b>Old Tashkent Hotel & Spa</b> dagi buyurtmangiz qabul qilindi.\n\n🛏 Xona: <b>${roomName}</b>\n💰 Jami to'lov: <b>$${booking.total_price}</b>.\n<i>Menejerimiz tasdiqlash uchun tez orada aloqaga chiqadi.</i>`;
    try {
      await bot.sendMessage(booking.tg_id, clientMsg, { parse_mode: 'HTML' });
    } catch (e) {}
  }
}

app.post('/api/bookings', async (req, res) => {
    if (isExpired()) {
        return res.status(403).json({ success: false, message: "Tizim to'lov qilinmagani sababli to'xtatilgan." });
    }

    const data = req.body;
    const nights = calcNights(data.check_in, data.check_out);
    const total_price = (ROOM_PRICES[data.room_type] || 0) * nights;
    const id = uuidv4();

    const insert = db.prepare(`
      INSERT INTO bookings (id,tg_id,first_name,phone,check_in,check_out,room_type,adults,children,trip_type,payment_type,special_requests,total_price)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    try {
      insert.run(
        id, 
        data.tg_id || '', 
        data.first_name, 
        data.phone, 
        data.check_in, 
        data.check_out, 
        data.room_type, 
        data.adults || 1, 
        data.children || 0, 
        data.trip_type || 'Juftlik', 
        data.payment_type || 'joyida',
        data.special_requests || '', 
        total_price
      );
      
      const newBooking = { id, ...data, total_price };
      setImmediate(() => handleNewBooking(newBooking, data));

      res.status(201).json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: 'Server xatoligi' });
    }
});

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => { console.log(`Backend ishga tushdi: http://localhost:${PORT}`); });
