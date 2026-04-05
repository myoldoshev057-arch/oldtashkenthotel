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

// ====================================================================
// SIZNING BOT TOKENINGIZ VA ADMIN (YOKI GURUH) ID RAQAMINGIZ
const BOT_TOKEN = '8750450645:AAGuiHZ3ApX40jQfBeglqv3sIZHGeb5vhQw';
const ADMIN_CHAT_ID = '6612990282'; // BUNI GURUH ID SIGA ALMASHTIRISHINGIZ MUMKIN (-100... bilan boshlanadi)
// ====================================================================

// Mehmonxonaning to'lov qabul qiladigan kartasi
const HOTEL_CARD_NUMBER = "8600 1234 5678 9012 (Humo - O.Tashkent)"; 

// OBUNA (ABONEMENT) MUDDATINI TEKSHIRISH (Faqat owner o'zgartiradi)
const EXPIRATION_DATE = process.env.EXPIRATION_DATE || '2099-12-31';

function isExpired() {
  return new Date() > new Date(EXPIRATION_DATE);
}

const bot = new TelegramBot(BOT_TOKEN, { 
  polling: { interval: 300, autoStart: true, params: { timeout: 10 } } 
});

// STATUS BUYRUG'I (Faqat admin uchun: Tizim muddati qancha qolganini ko'rish)
bot.onText(/\/status/, (msg) => {
  if (msg.chat.id.toString() !== ADMIN_CHAT_ID) return;
  const exp = new Date(EXPIRATION_DATE);
  const diffTime = exp - new Date();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) {
    bot.sendMessage(msg.chat.id, `⚙️ <b>Tizim holati:</b> Faol\n⏳ <b>Muddati tugashiga:</b> ${diffDays} kun qoldi.\n📅 <b>Sana:</b> ${EXPIRATION_DATE}`, {parse_mode: 'HTML'});
  } else {
    bot.sendMessage(msg.chat.id, `⚠️ <b>Tizim to'xtatilgan!</b> To'lov muddati tugagan. Dasturchi bilan bog'laning.`, {parse_mode: 'HTML'});
  }
});

// MIJOZ START BOSGANDA
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (isExpired()) return bot.sendMessage(chatId, "⚠️ Kechirasiz, mehmonxona tizimi vaqtincha to'xtatilgan. Administrator bilan bog'laning.");

  const welcomeText = `✨ <b>Old Tashkent Hotel & Spa'ga Xush kelibsiz!</b>\nXonalarni ko'rish va band qilish uchun quyidagi tugmani bosing 👇`;
  const opts = { parse_mode: 'HTML', reply_markup: { inline_keyboard: [
    [{ text: "🏨 Xona Band Qilish", web_app: { url: "https://myoldoshev057-arch.github.io/oldtashkenthotel" } }]
  ]}};
  bot.sendMessage(chatId, welcomeText, opts);
});

// ── BAZA ─────────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || './db/aurum.sqlite';
const dbDir   = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Bazani yangilash
try { db.exec(`ALTER TABLE bookings ADD COLUMN currency TEXT DEFAULT 'USD';`); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, tg_id TEXT, first_name TEXT, phone TEXT, 
    check_in TEXT, check_out TEXT, room_type TEXT, adults INTEGER DEFAULT 1, 
    children INTEGER DEFAULT 0, trip_type TEXT, special_requests TEXT, 
    status TEXT DEFAULT 'pending', total_price TEXT, currency TEXT DEFAULT 'USD',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// MIJOZ CHEK (RASM) YUBORGANDA USHLAB OLISH VA ADMINGA YUBORISH
bot.on('photo', (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() === ADMIN_CHAT_ID) return; // Admin o'zi rasm tashlasa e'tibor bermaydi

  const photoId = msg.photo[msg.photo.length - 1].file_id; // Eng sifatli rasmni oladi
  
  bot.sendMessage(chatId, "✅ To'lov chekingiz qabul qilindi. Adminga yuborildi. Iltimos, tasdiqlashlarini kuting.");

  // Adminga rasmni Forward qilish (Kapsheni bilan)
  bot.sendPhoto(ADMIN_CHAT_ID, photoId, {
    caption: `💸 <b>MIJOZDAN TO'LOV CHEKI KELDI!</b>\n\nMijoz ID: ${chatId}\n\n<i>Quyidagi tugma orqali so'nggi bronni tasdiqlashingiz mumkin:</i>`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: "✅ To'lovni tasdiqlash", callback_data: `confirm_payment_${chatId}` }]]
    }
  });
});

// ADMIN TUGMALARI BOSHQRUVI
bot.on('callback_query', (query) => {
  const action = query.data;
  const chatId = query.message.chat.id; // Bu yerda adminning ID si bo'ladi
  
  if (action.startsWith('confirm_payment_')) {
    const clientTgId = action.split('_')[2];
    
    // Adminga xabar
    bot.editMessageCaption("✅ <b>Chek tasdiqlandi va mijozga xabar yuborildi.</b>", {
      chat_id: chatId, message_id: query.message.message_id, parse_mode: 'HTML'
    });

    // Bazada statusni "Confirmed" qilib qo'yish
    const updateStmt = db.prepare(`UPDATE bookings SET status = 'confirmed' WHERE tg_id = ? ORDER BY created_at DESC LIMIT 1`);
    updateStmt.run(clientTgId);

    // Mijozga xabar
    bot.sendMessage(clientTgId, "🎉 <b>Tabriklaymiz! Sizning to'lovingiz va xona brongiz muvaffaqiyatli tasdiqlandi.</b>\nMehmonxonada kutib qolamiz!", {parse_mode: 'HTML'});
  } 
  else if (action.startsWith('cancel_')) {
    bot.editMessageText("❌ Bron BEKOR QILINDI.", { chat_id: chatId, message_id: query.message.message_id });
  }
});

// ── API ROUTES ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*', credentials: true })); 
app.use(express.json());

const ROOM_NAMES  = { double_room: 'Double Room', twin_room: 'Twin Room', triple_room: 'Triple Room', deluxe_family: 'Deluxe Family Room', two_bedroom_suite: 'Two-Bedroom Suite' };

async function handleNewBooking(booking, rawData) {
  const roomName = ROOM_NAMES[booking.room_type] || booking.room_type;
  
  // 1. ADMINGA KELADIGAN XABAR (Faqat xabar, to'lov emas)
  const adminMsg = `
🔔 <b>YANGI SO'ROV — OLD TASHKENT</b>

👤 <b>Mijoz:</b> ${booking.first_name}
📞 <b>Tel:</b> ${booking.phone}
🛏 <b>Xona:</b> ${roomName}
📅 <b>Sana:</b> ${booking.check_in} ➡️ ${booking.check_out}

👥 <b>Mehmonlar:</b> ${rawData.adults} ta katta, ${rawData.children} ta bola
📝 <b>Istak:</b> ${booking.special_requests || "Yo'q"}

💰 <b>Jami ko'rsatilgan:</b> ${booking.total_price}
<i>Holati: To'lov (chek) kutilmoqda...</i>
  `;
  
  try { await bot.sendMessage(ADMIN_CHAT_ID, adminMsg, { parse_mode: 'HTML' }); } catch (e) { }

  // 2. MIJOZGA KELADIGAN XABAR VA TO'LOV SO'ROVI
  if (booking.tg_id) {
    const clientMsg = `
Hurmatli <b>${booking.first_name}</b>, so'rovingiz qabul qilindi.

Broningizni 100% kafolatlash uchun jami summaning xohlagan qismini (masalan 10% yoki 1 kunlik narxni) quyidagi kartaga o'tkazing:

💳 <b>Karta:</b> <code>${HOTEL_CARD_NUMBER}</code>

⚠️ <b>DIQQAT:</b> To'lovni amalga oshirgach, tasdiqlovchi rasmni (skrinshot yoki chekni) to'g'ridan-to'g'ri shu botga yuboring!
    `;
    try { await bot.sendMessage(booking.tg_id, clientMsg, { parse_mode: 'HTML' }); } catch (e) {}
  }
}

app.post('/api/bookings', async (req, res) => {
    if (isExpired()) return res.status(403).json({ success: false });

    const data = req.body;
    const id = uuidv4();

    const insert = db.prepare(`
      INSERT INTO bookings (id,tg_id,first_name,phone,check_in,check_out,room_type,adults,children,trip_type,special_requests,total_price,currency)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    try {
      insert.run(id, data.tg_id || '', data.first_name, data.phone, data.check_in, data.check_out, data.room_type, data.adults || 1, data.children || 0, data.trip_type || 'Juftlik', data.special_requests || '', data.total_price, data.currency || 'USD');
      
      const newBooking = { id, ...data };
      setImmediate(() => handleNewBooking(newBooking, data));

      res.status(201).json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false });
    }
});

app.listen(PORT, () => { console.log(`Backend ishga tushdi: http://localhost:${PORT}`); });
