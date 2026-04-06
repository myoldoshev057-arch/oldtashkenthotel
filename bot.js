require("dotenv").config();
const { Telegraf, Markup, session } = require("telegraf");
const http = require("http");
const { HOTEL, ROOMS, SERVICES, NEARBY, POLICIES } = require("./data");

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());
const ADMIN_ID = process.env.ADMIN_CHAT_ID;
const MINIAPP_URL = process.env.MINIAPP_URL || "https://myoldoshev057-arch.github.io/Oldhotel/";
const PORT = process.env.PORT || 3000;

// ═══ WEBHOOK SERVER (saytdan kelgan bronlar) ═══════════════════
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  if (req.method === "POST" && req.url === "/booking") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        await sendBookingToAdmin(data, "🌐 SAYT");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }
  if (req.method === "GET") { res.writeHead(200); return res.end("Old Tashkent Bot OK"); }
  res.writeHead(404); res.end();
});
server.listen(PORT, () => console.log(`Server ${PORT} portda ishlayapti`));

// ═══ ADMIN GA XABAR ═══════════════════════════════════════════
async function sendBookingToAdmin(b, source, tgUser) {
  const userLine = tgUser ? `\nTelegram: @${tgUser.username || "—"} | ID: ${tgUser.id}` : "";
  const msg =
    `🔔 *${source} — YANGI BRON!*\n\n` +
    `🛏 Xona: ${b.room_name}\n` +
    `📅 Kelish: ${b.checkin}\n` +
    `📅 Ketish: ${b.checkout}\n` +
    `🌙 Kunlar: ${b.nights}\n` +
    `👥 Kattalar: ${b.adults} | Bolalar: ${b.children}\n` +
    `🎯 Maqsad: ${b.purpose}\n` +
    `💳 To'lov: ${b.payment === "advance" ? `Avans ($${b.advance_usd})` : "Joyida"}\n` +
    `💰 Jami: $${b.total_usd}\n\n` +
    `👤 Ism: ${b.name}\n` +
    `📞 Telefon: ${b.phone}\n` +
    `💬 Xohish: ${b.wishes}${userLine}`;
  if (ADMIN_ID) {
    await bot.telegram.sendMessage(ADMIN_ID, msg, { parse_mode: "Markdown" }).catch(() => {});
  }
}

// ═══ MINI APP DAN BRON ════════════════════════════════════════
bot.on("web_app_data", async ctx => {
  try {
    const b = JSON.parse(ctx.webAppData.data.text());
    await ctx.reply(
      `✅ *Bron so'rovingiz qabul qilindi!*\n\n` +
      `🛏 ${b.room_name}\n` +
      `📅 ${b.checkin} → ${b.checkout} (${b.nights} kecha)\n` +
      `👥 ${b.adults} katta, ${b.children} bola\n` +
      `💰 Jami: $${b.total_usd}\n\n` +
      `Xodimlarimiz *${b.phone}* raqamiga tez orada qo'ng'iroq qiladi!\n` +
      `⏰ Ish vaqti: 09:00 – 22:00`,
      { parse_mode: "Markdown", ...mainMenu() }
    );
    await sendBookingToAdmin(b, "📱 MINI APP", ctx.from);
  } catch (e) {
    ctx.reply("❌ Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
  }
});

// ═══ MENYU ════════════════════════════════════════════════════
function mainMenu() {
  return Markup.keyboard([
    ["🛏 Xona turlari", "🎯 Xizmatlar"],
    ["📱 Bron qilish", "📍 Manzil & Aloqa"],
    ["ℹ️ Mehmonxona haqida", "📋 Qoidalar"],
  ]).resize();
}

// ═══ /start ═══════════════════════════════════════════════════
bot.start(ctx => {
  const name = ctx.from.first_name || "Mehmon";
  ctx.reply(
    `🌟 *Xush kelibsiz, ${name}!*\n\n` +
    `🏨 Old Tashkent Hotel & Spa\n` +
    `⭐⭐⭐ | ${HOTEL.rating}\n\n` +
    `Toshkentda ${HOTEL.rooms_total} ta xona, SPA, basseyn, restoran!\n\n` +
    `📱 *Bron qilish* tugmasi orqali Mini App da qulay bron qiling!\n\n` +
    `Menyudan tanlang 👇`,
    { parse_mode: "Markdown", ...mainMenu() }
  );
});

// ═══ BRON — MINI APP TUGMASI ══════════════════════════════════
bot.hears("📱 Bron qilish", ctx => {
  ctx.reply(
    `📱 *Bron qilish*\n\n` +
    `Mini App orqali qulay va tez:\n` +
    `✅ Xona tanlash\n✅ Sanalarni belgilash\n` +
    `✅ Narxni ko'rish\n✅ So'rov yuborish\n\n` +
    `👇 Tugmani bosing:`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.webApp("🏨 Mini App — Bron qilish", MINIAPP_URL)],
        [Markup.button.callback("📞 Telefon orqali", "call_book")],
      ]),
    }
  );
});

bot.action("call_book", ctx => {
  ctx.answerCbQuery();
  ctx.reply(`📞 *Telefon orqali bron:*\n\n${HOTEL.phone}\n⏰ 09:00 – 22:00`, { parse_mode: "Markdown" });
});

// ═══ XONA TURLARI ═════════════════════════════════════════════
bot.hears("🛏 Xona turlari", ctx => {
  const btns = ROOMS.map(r => [Markup.button.callback(`${r.emoji} ${r.name}`, `room_${r.id}`)]);
  ctx.reply(`🛏 *Xona turlarini tanlang:*\nJami *${HOTEL.rooms_total} ta* xona mavjud.`,
    { parse_mode: "Markdown", ...Markup.inlineKeyboard(btns) });
});

ROOMS.forEach(room => {
  bot.action(`room_${room.id}`, ctx => {
    ctx.answerCbQuery();
    const features = room.features.join("\n");
    ctx.editMessageText(
      `${room.emoji} *${room.name}*\n\n👥 ${room.capacity}\n💰 *${room.price}*\n\n${features}`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.webApp("📱 Bron qilish", MINIAPP_URL)],
          [Markup.button.callback("⬅️ Orqaga", "back_rooms")],
        ]),
      }
    );
  });
});

bot.action("back_rooms", ctx => {
  ctx.answerCbQuery();
  const btns = ROOMS.map(r => [Markup.button.callback(`${r.emoji} ${r.name}`, `room_${r.id}`)]);
  ctx.editMessageText(`🛏 *Xona turlarini tanlang:*\nJami *${HOTEL.rooms_total} ta* xona mavjud.`,
    { parse_mode: "Markdown", ...Markup.inlineKeyboard(btns) });
});

// ═══ XIZMATLAR ════════════════════════════════════════════════
bot.hears("🎯 Xizmatlar", ctx => {
  ctx.reply("🎯 *Xizmat turini tanlang:*", {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🍳 Ovqatlanish", "svc_food")],
      [Markup.button.callback("🏊 Sport & Dam olish", "svc_recreation")],
      [Markup.button.callback("🛎 Umumiy Xizmatlar", "svc_general")],
    ]),
  });
});

["food", "recreation", "general"].forEach(key => {
  bot.action(`svc_${key}`, ctx => {
    ctx.answerCbQuery();
    const s = SERVICES[key];
    ctx.editMessageText(`${s.emoji} *${s.name}*\n\n${s.items.map(i => `• ${i}`).join("\n")}`, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([[Markup.button.callback("⬅️ Orqaga", "back_svc")]]),
    });
  });
});

bot.action("back_svc", ctx => {
  ctx.answerCbQuery();
  ctx.editMessageText("🎯 *Xizmat turini tanlang:*", {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🍳 Ovqatlanish", "svc_food")],
      [Markup.button.callback("🏊 Sport & Dam olish", "svc_recreation")],
      [Markup.button.callback("🛎 Umumiy Xizmatlar", "svc_general")],
    ]),
  });
});

// ═══ MANZIL ═══════════════════════════════════════════════════
bot.hears("📍 Manzil & Aloqa", async ctx => {
  await ctx.reply(
    `📍 *Manzil:*\n${HOTEL.address}\n\n` +
    `📞 ${HOTEL.phone}\n🌐 ${HOTEL.website}\n\n` +
    `✈️ Aeroport: ~12 daqiqa\n🏙️ Markaz: ~3.4 km`,
    { parse_mode: "Markdown" }
  );
  await ctx.replyWithLocation(HOTEL.location.lat, HOTEL.location.lon);
});

// ═══ HAQIDA ═══════════════════════════════════════════════════
bot.hears("ℹ️ Mehmonxona haqida", ctx => {
  ctx.reply(
    `🏨 *Old Tashkent Hotel & Spa*\n⭐⭐⭐ | ${HOTEL.rating}\n\n` +
    `${HOTEL.floors} qavatli bino, ${HOTEL.rooms_total} ta xona.\n\n` +
    `🏊 SPA, basseyn, sauna\n🍳 Bufet nonushta (bepul)\n☕ Donli qahva\n` +
    `🅿️ Bepul parking\n📶 Bepul Wi-Fi\n✈️ Transfer xizmati\n🌿 Xususiy bog'\n\n` +
    `⭐ "Nonushta ajoyib, xodimlar mehribon"\n` +
    `⭐ "Aeroport yaqin, basseyn yaxshi"`,
    { parse_mode: "Markdown" }
  );
});

// ═══ QOIDALAR ═════════════════════════════════════════════════
bot.hears("📋 Qoidalar", ctx => {
  ctx.reply(
    `📋 *Qoidalar:*\n\n${POLICIES.map(p => `• ${p}`).join("\n")}`,
    { parse_mode: "Markdown" }
  );
});

bot.on("message", ctx => ctx.reply("Menyudan tanlang 👇", mainMenu()));

// ═══ ISHGA TUSHIRISH ══════════════════════════════════════════
bot.launch().then(() => console.log("✅ Bot ishga tushdi!")).catch(console.error);
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
