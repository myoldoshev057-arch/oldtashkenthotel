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
// SIZNING BOT TOKENINGIZ VA SUPER ADMIN (OWNER) ID RAQAMINGIZ
const BOT_TOKEN = '8750450645:AAGuiHZ3ApX40jQfBeglqv3sIZHGeb5vhQw';
const SUPER_ADMIN_ID = '6612990282'; // BU YERGA FAQAT O'ZINGIZNING ID NGIZNI YOZING
// ====================================================================

// 30 KUNLIK LIMIT (Tizim ishlash muddati)
const EXPIRATION_DATE = process.env.EXPIRATION_DATE || '2099-12-31';
function isExpired() { return new Date() > new Date(EXPIRATION_DATE); }

// ── MA'LUMOTLAR BAZASI (SQLite) ──────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || './db/aurum.sqlite';
const dbDir   = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// BAZA JADVALLARI (Adminlar va Bronlar)
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    tg_id TEXT PRIMARY KEY,
    added_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, tg_id TEXT, first_name TEXT, 
    phone TEXT, check_in TEXT, check_out TEXT, room_type TEXT, 
    adults INTEGER DEFAULT 1, children INTEGER DEFAULT 0, trip_type TEXT,
    payment_type TEXT DEFAULT 'joyida', special_requests TEXT, 
    status TEXT DEFAULT 'pending', total_price REAL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// Dastur ishga tushganda Super Adminni avtomatik bazaga qo'shib qo'yamiz
try {
  const insertAdmin = db.prepare(`INSERT OR IGNORE INTO admins (tg_id) VALUES (?)`);
  insertAdmin.run(SUPER_ADMIN_ID);
} catch(e) {}

// Adminlarni tekshirish funksiyalari
function getAllAdmins() {
  const rows = db.prepare('SELECT tg_id FROM admins').all();
  return rows.map(r => r.tg_id);
}
function isAdmin(id) {
  return getAllAdmins().includes(id.toString());
}

// ── TELEGRAM BOT ────────────────────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, { 
  polling: { interval: 300, autoStart: true, params: { timeout: 10 } } 
});
bot.on('polling_error', (error) => { console.log('Bot polling error:', error.message); });

// ====================================================================
// 👑 SUPER ADMIN VA ADMIN BUYRUQLARI
// ====================================================================

// Odamlar o'z ID sini bilishi uchun (Sizga aytishlari uchun)
bot.onText(/\/myid/, (msg) => {
  bot.sendMessage(msg.chat.id, `Sizning Telegram ID raqamingiz:\n<code>${msg.chat.id}</code>`, {parse_mode: 'HTML'});
});

// YAngi Admin qo'shish (Faqat Super Admin ishlata oladi)
bot.onText(/\/addadmin (.+)/, (msg, match) => {
  if (msg.chat.id.toString() !== SUPER_ADMIN_ID) return;
  const newAdminId = match[1].trim();
  try {
    db.prepare('INSERT OR IGNORE INTO admins (tg_id) VALUES (?)').run(newAdminId);
    bot.sendMessage(msg.chat.id, `✅ ID: ${newAdminId} muvaffaqiyatli ADMIN qilib tayinlandi! Endi u ham xabarlarni oladi va bazani ko'ra oladi.`);
    bot.sendMessage(newAdminId, `🎉 <b>Tabriklaymiz!</b> Owner tomonidan sizga Old Tashkent Hotel botida <b>ADMIN</b> huquqi berildi.\n/baza - Tasdiqlangan bronlarni ko'rish\n/status - Tizim muddatini ko'rish`, {parse_mode: 'HTML'});
  } catch (e) {
    bot.sendMessage(msg.chat.id, "❌ Xatolik yuz berdi. ID raqamni to'g'ri kiritganingizni tekshiring.");
  }
});

// Adminni o'chirish
bot.onText(/\/deladmin (.+)/, (msg, match) => {
  if (msg.chat.id.toString() !== SUPER_ADMIN_ID) return;
  const oldAdminId = match[1].trim();
  if (oldAdminId === SUPER_ADMIN_ID) return bot.sendMessage(msg.chat.id, "O'zingizni o'chira olmaysiz!");
  
  db.prepare('DELETE FROM admins WHERE tg_id = ?').run(oldAdminId);
  bot.sendMessage(msg.chat.id, `🗑 ID: ${oldAdminId} adminlikdan olib tashlandi.`);
});

// Adminlar ro'yxatini ko'rish
bot.onText(/\/adminlist/, (msg) => {
  if (msg.chat.id.toString() !== SUPER_ADMIN_ID) return;
  const admins = getAllAdmins();
  bot.sendMessage(msg.chat.id, `👑 <b>Tizimdagi Adminlar ro'yxati:</b>\n\n` + admins.map((a, i) => `${i+1}. <code>${a}</code>`).join('\n'), {parse_mode: 'HTML'});
});

// 30 kunlik tizim muddatini ko'rish (Hamma adminlar ko'ra oladi)
bot.onText(/\/status/, (msg) => {
  if (!isAdmin(msg.chat.id)) return;
  const exp = new Date(EXPIRATION_DATE);
  const diffDays = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));
  if (diffDays > 0) {
    bot.sendMessage(msg.chat.id, `⚙️ <b>Tizim holati:</b> Faol\n⏳ <b>Tizim tugashiga:</b> ${diffDays} kun qoldi.\n📅 <b>To'lov sanasi:</b> ${EXPIRATION_DATE}`, {parse_mode: 'HTML'});
  } else {
    bot.sendMessage(msg.chat.id, `⚠️ <b>Tizim to'xtatilgan!</b> To'lov muddati tugagan. Owner bilan bog'laning.`, {parse_mode: 'HTML'});
  }
});

// TASDIQLANGAN BAZANI KO'RISH (Adminlar uchun)
bot.onText(/\/baza/, (msg) => {
  if (!isAdmin(msg.chat.id)) return;
  
  const confirmedBookings = db.prepare(`SELECT * FROM bookings WHERE status = 'confirmed' ORDER BY check_in ASC`).all();
  
  if (confirmedBookings.length === 0) {
    return bot.sendMessage(msg.chat.id, "📭 Hozircha tasdiqlangan bronlar yo'q.");
  }

  let text = `📊 <b>TASDIQLANGAN VA FAOL BRONLAR:</b>\n\n`;
  confirmedBookings.forEach((b, i) => {
    text += `${i+1}. 👤 <b>${b.first_name}</b> (📞 ${b.phone})\n`;
    text += `   🛏 Xona: ${b.room_type}\n`;
    text += `   📅 ${b.check_in} dan ${b.check_out} gacha\n`;
    text += `   💰 To'lov turi: ${b.payment_type === 'avans' ? '10% Avans' : 'Joyida'} | Jami: $${b.total_price}\n\n`;
  });

  // Agar text juda uzun bo'lib ketsa telegram xato bermasligi uchun qismlarga bo'lish mumkin (ammo hozircha bittada ketadi)
  bot.sendMessage(msg.chat.id, text, {parse_mode: 'HTML'});
});


// ====================================================================
// MIJOZLAR UCHUN ASOSIY QISM
// ====================================================================

// BOTGA /start BOSILGANDA
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  if (isExpired()) {
    bot.sendMessage(chatId, "⚠️ Kechirasiz, mehmonxona tizimi vaqtincha to'xtatilgan (Texnik xizmat). Administrator bilan bog'laning.");
    return;
  }

  const welcomeText = `✨ <b>Old Tashkent Hotel & Spa'ga Xush kelibsiz!</b>\nMijozlarga yuqori darajadagi qulaylik va beqiyos mehmondo'stlikni taqdim etamiz.\nXonalarni ko'rish va band qilish uchun quyidagi tugmani bosing 👇`;
  const opts = { parse_mode: 'HTML', reply_markup: { inline_keyboard: [
        [{ text: "🏨 Xona Band Qilish", web_app: { url: "https://myoldoshev057-arch.github.io/oldtashkenthotel" } }]
  ]}};
  bot.sendMessage(chatId, welcomeText, opts);
});

// ADMINLAR TOMONIDAN BRONNI TASDIQLASH/BEKOR QILISH
bot.on('callback_query', (query) => {
  const action = query.data;
  const adminId = query.message.chat.id;
  
  if(action.startsWith('confirm_')) {
    const bookingId = action.split('confirm_')[1];
    
    // Bron holatini tekshirish
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return bot.answerCallbackQuery(query.id, {text: "Xatolik! Bron topilmadi."});
    if (booking.status === 'confirmed') return bot.answerCallbackQuery(query.id, {text: "Bu bron allaqachon boshqa admin tomonidan tasdiqlangan!", show_alert: true});
    
    // Statusni yangilash
    db.prepare(`UPDATE bookings SET status = 'confirmed' WHERE id = ?`).run(bookingId);
    
    bot.editMessageText(`✅ <b>Bron TASDIQLANDI!</b> (Bazaga qo'shildi)\nTasdiqladi: Admin [${adminId}]`, { chat_id: adminId, message_id: query.message.message_id, parse_mode: 'HTML' });
    
    // Mijozga xabar
    if (booking.tg_id) {
      bot.sendMessage(booking.tg_id, `🎉 <b>Hurmatli ${booking.first_name}, sizning brongiz ma'muriyat tomonidan tasdiqlandi!</b>\nKelish sanasi: ${booking.check_in}\nMehmonxonada kutib qolamiz.`, {parse_mode: 'HTML'});
    }

  } else if(action.startsWith('cancel_')) {
    const bookingId = action.split('cancel_')[1];
    db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(bookingId);
    bot.editMessageText("❌ Bron BEKOR QILINDI va bazaga qabul qilinmadi.", { chat_id: adminId, message_id: query.message.message_id });
  }
});


// ── API ROUTES ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*', credentials: true })); 
app.use(express.json());

const ROOM_PRICES = { double_room: 72, twin_room: 72, triple_room: 88, deluxe_family: 95, two_bedroom_suite: 120 };
const ROOM_NAMES  = { double_room: 'Double Room (1 ta katta yotoq)', twin_room: 'Twin Room (2 ta yotoq)', triple_room: 'Triple Room (3 kishilik)', deluxe_family: 'Deluxe Family Room', two_bedroom_suite: 'Two-Bedroom Suite (Lyuks)' };

function calcNights(checkIn, checkOut) {
  const ms = new Date(checkOut) - new Date(checkIn);
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

async function handleNewBooking(booking, rawData) {
  const nights = calcNights(booking.check_in, booking.check_out);
  const roomName = ROOM_NAMES[booking.room_type] || booking.room_type;
  const avansSumma = (booking.total_price * 0.1).toFixed(2);
  const paymentText = rawData.payment_type === 'avans' ? `🟡 <b>10% AVANS KARTA ORQALI</b> ($${avansSumma})` : `🏨 <b>Joyida to'lash</b>`;

  // BARCHA ADMINLARGA YUBORILADIGAN XABAR
  const adminMsg = `
🔔 <b>YANGI SO'ROV KELDI! (Kutilmoqda...)</b>

👤 <b>Mijoz:</b> ${booking.first_name}
📞 <b>Tel:</b> ${booking.phone}
🛏 <b>Xona:</b> ${roomName}
📅 <b>Sana:</b> ${booking.check_in} ➡️ ${booking.check_out} (${nights} kecha)

👥 <b>Mehmonlar:</b> ${rawData.adults} ta katta, ${rawData.children} ta bola
🎯 <b>Safar turi:</b> ${rawData.trip_type}
💳 <b>To'lov:</b> ${paymentText}
📝 <b>Istak:</b> ${booking.special_requests || "Yo'q"}

💰 <b>Jami summa:</b> $${booking.total_price}

<i>DIQQAT: Quyidagi "Tasdiqlash" tugmasi bosilmaguncha bu bron Bazaga qo'shilmaydi! (Odam tekshirib keyin bosishi kerak).</i>
  `;
  
  const opts = {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [
        [{ text: "✅ TASDIQLASH VA BAZAGA QO'SHISH", callback_data: `confirm_${booking.id}` }],
        [{ text: "❌ Bekor qilish", callback_data: `cancel_${booking.id}` }]
    ]}
  };
  
  // Hamma adminlarga tarqatish
  const admins = getAllAdmins();
  admins.forEach(adminChatId => {
    bot.sendMessage(adminChatId, adminMsg, opts).catch(err => console.log("Adminga xabar ketmadi:", err.message));
  });

  // Mijozga xabar
  if (booking.tg_id) {
    bot.sendMessage(booking.tg_id, `Hurmatli <b>${booking.first_name}</b>, so'rovingiz menejerga yuborildi.\nUlar tekshirib tasdiqlaganidan so'ng sizga shu bot orqali xabar keladi. Kuting...`, { parse_mode: 'HTML' });
  }
}

app.post('/api/bookings', async (req, res) => {
    if (isExpired()) return res.status(403).json({ success: false, message: "Tizim to'lov qilinmagani sababli to'xtatilgan." });

    const data = req.body;
    const nights = calcNights(data.check_in, data.check_out);
    const total_price = (ROOM_PRICES[data.room_type] || 0) * nights;
    const id = uuidv4();

    const insert = db.prepare(`
      INSERT INTO bookings (id,tg_id,first_name,phone,check_in,check_out,room_type,adults,children,trip_type,payment_type,special_requests,total_price)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    try {
      insert.run(id, data.tg_id || '', data.first_name, data.phone, data.check_in, data.check_out, data.room_type, data.adults || 1, data.children || 0, data.trip_type || 'Juftlik', data.payment_type || 'joyida', data.special_requests || '', total_price);
      
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
