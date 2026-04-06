// ============================================================
//  OLD TASHKENT HOTEL & SPA — Ma'lumotlar bazasi
// ============================================================

const HOTEL = {
  name: "🏨 Old Tashkent Hotel & Spa",
  stars: "⭐⭐⭐",
  rating: "9.2/10 (Booking.com)",
  website: "https://oldtashkenthotel.uz",
  address: "Toshkent sh., Yakkasaroy tumani,\nYusuf Hamadoni ko'chasi, 89B",
  phone: "+998 (90) 971-62-08",
  whatsapp: "https://wa.me/998909716208",
  telegram_contact: "@998909716208",
  checkin: "14:00",
  checkout: "12:00",
  rooms_total: 35,
  floors: 5,
  location: { lat: 41.286256, lon: 69.245625 },
};

const ROOMS = [
  {
    id: "standard",
    emoji: "🛏",
    name: "Standard Xona",
    price: "$68+ / kecha",
    capacity: "1-2 kishi",
    description:
      "Qulay va toza xona. Konditsioner, yasli TV, muzlatgich, elektr choynak, bepul Wi-Fi. Hammomda: dush, fen, tuvalet jihozlari, shippak.",
    features: ["✅ Konditsioner", "✅ Yasli ekranli TV", "✅ Muzlatgich", "✅ Elektr choynak", "✅ Bepul Wi-Fi", "✅ Xavfsizlik seifi", "✅ Ish stoli", "✅ Hammom (dush + fen)"],
  },
  {
    id: "deluxe",
    emoji: "🛎",
    name: "Deluxe / Superior Xona",
    price: "So'rovga ko'ra",
    capacity: "1-3 kishi",
    description:
      "King yoki Twin karavot. Kengaytirilgan jihozlar, hammomda vanna ham mavjud. Ovoz izolyatsiyasi bor.",
    features: ["✅ King/Twin karavot", "✅ Vanna + dush", "✅ Ovoz izolyatsiyasi", "✅ Konditsioner", "✅ TV (kabel kanallar)", "✅ Muzlatgich & choynak", "✅ Xavfsizlik seifi", "✅ Bepul Wi-Fi"],
  },
  {
    id: "triple",
    emoji: "👨‍👩‍👧",
    name: "Triple (3 kishilik) Xona",
    price: "So'rovga ko'ra",
    capacity: "3 kishi",
    description:
      "Oila yoki do'stlar uchun. 3 ta karavot, keng maydon. Konditsioner, TV, muzlatgich, shkaf.",
    features: ["✅ 3 ta karavot", "✅ Konditsioner", "✅ Televizor", "✅ Muzlatgich", "✅ Shkaf", "✅ Bepul Wi-Fi", "✅ Hammom"],
  },
  {
    id: "suite",
    emoji: "👑",
    name: "Suite (Lyuks)",
    price: "So'rovga ko'ra",
    capacity: "1-2 kishi",
    description:
      "Alohida yotoqxona + yashash xonasi. Vanna, shahar manzarasi. Eng yuqori qulaylik.",
    features: ["✅ Alohida yotoqxona", "✅ Yashash xonasi", "✅ Vanna (premium)", "✅ Shahar manzarasi", "✅ Konditsioner", "✅ TV (kabel)", "✅ O'tirish joyi", "✅ Elektr choynak"],
  },
  {
    id: "family",
    emoji: "🏠",
    name: "Family Room (Oilaviy)",
    price: "So'rovga ko'ra",
    capacity: "2-4 kishi",
    description:
      "Oilalar uchun maxsus. Keng maydon, barcha zaruriy jihozlar. Bolalar xush kelibsiz!",
    features: ["✅ Oila uchun keng xona", "✅ Konditsioner", "✅ TV", "✅ Bepul Wi-Fi", "✅ Hammom", "✅ Bolalar uchun qulay"],
  },
];

const SERVICES = {
  food: {
    emoji: "🍳",
    name: "Ovqatlanish",
    items: [
      "Restoran (5-qavat) — Yevropa & halol taomlar",
      "Nonushta: Bufet (shved stoli) — 07:00–10:30",
      "Donli qahva automati ☕",
      "Bar — issiq & sovuq ichimliklar",
      "Xonaga taom yetkazish (Room Service)",
      "Teras — ochiq havo ovqatlanish",
      "Pool Bar — basseyn yonida",
    ],
  },
  recreation: {
    emoji: "🏊",
    name: "Sport & Dam olish",
    items: [
      "Mavsumiy ochiq basseyn 🏊",
      "Yopiq basseyn (yil davomida)",
      "SPA markaz 💆",
      "Sauna (qo'shimcha to'lov)",
      "Bug' xonasi (Steam Room)",
      "Bilyard 🎱",
      "Mangal / Barbekyu maydoni 🔥",
      "Xususiy bog' 🌿",
    ],
  },
  general: {
    emoji: "🛎",
    name: "Umumiy Xizmatlar",
    items: [
      "24 soatlik qabulxona",
      "Bepul Wi-Fi (hamma joyda)",
      "Bepul xususiy avtoturargoh 🅿️",
      "Transfer xizmati (aeroport) ✈️",
      "Valyuta almashtirish 💱",
      "Bankomat (sarhadda) 🏧",
      "Kunlik xona tozalash",
      "Ekskursiya & sayohat yordami",
      "Konferens & banket zallari",
      "Lift mavjud ♿",
    ],
  },
};

const NEARBY = [
  { emoji: "✈️", name: "Xalqaro Aeroport", distance: "~4 km (12 daqiqa)" },
  { emoji: "🏙️", name: "Shahar markazi", distance: "~3.4 km" },
  { emoji: "🎭", name: "Navoiy Opera va Balet Teatri", distance: "Yaqin" },
  { emoji: "🖼️", name: "Tasviriy San'at Muzeyi", distance: "~2.7 km" },
  { emoji: "🎡", name: "Magic City Park", distance: "Yaqin" },
  { emoji: "⛸️", name: "Muzqaymoq maydoni", distance: "Yaqin" },
  { emoji: "🏬", name: "Savdo markazlari", distance: "Yaqin" },
];

const POLICIES = [
  "📅 Kirish: 14:00 dan",
  "📅 Chiqish: 12:00 gacha",
  "🚫 Uy hayvonlari ruxsat etilmaydi",
  "🚭 Xonalarda chekish taqiqlanadi (alohida joy bor)",
  "👶 Bolalar xush kelibsiz",
  "💳 Naqd & karta bilan to'lov",
  "❌ Bron bekor qilish — tarif turiga ko'ra",
];

module.exports = { HOTEL, ROOMS, SERVICES, NEARBY, POLICIES };
