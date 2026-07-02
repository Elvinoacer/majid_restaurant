/**
 * MajidOS seed script (PRD §9 Phase 0).
 *
 * Seeds a realistic Majid Restaurant tenant — Nakuru-based Kenyan/Indian
 * restaurant serving breakfast-through-dinner with biryani as a signature
 * item. Uses placeholder images hosted on Unsplash source URLs so the demo
 * looks real without needing Cloudinary credentials.
 *
 * Run with: `bun prisma/seed.ts` (or `bun run db:seed` if a script alias exists).
 *
 * Idempotent: re-running upserts by slug/email/name and clears child rows
 * before re-inserting, so it can be re-run safely.
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { serializeTags } from "../src/lib/db/serialize";

const MAJID_SLUG = "majid-restaurant";

async function main() {
  console.log("→ Seeding MajidOS demo data...");

  // ── Restaurant row ───────────────────────────────────────
  const restaurant = await db.restaurant.upsert({
    where: { slug: MAJID_SLUG },
    update: {
      name: "Majid Restaurant",
      tagline: "Nakuru's home of biryani — breakfast through dinner",
      description:
        "Family-run Kenyan-Indian restaurant in the heart of Nakuru CBD. " +
        "Serving full breakfast, lunch, and dinner with dine-in, takeaway, and delivery. " +
        "Famous for our chicken and mutton biryani, freshly baked chapati, and house-made mango lassi.",
      whatsappPhone: "254712345678",
      contactPhone: "+254 712 345 678",
      contactEmail: "hello@majidrestaurant.co.ke",
      address: "Kenyatta Avenue, Nakuru CBD, Nakuru, Kenya",
      latitude: -0.3031,
      longitude: 36.08,
      parkingInfo:
        "Street parking on Kenyatta Avenue. Paid basement parking at Westside Mall (200m walk).",
      logoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop",
      coverImageUrl:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&h=900&fit=crop",
      hasEventSpace: true,
      comboBuilderEnabled: true,
      currency: "KES",
      timezone: "Africa/Nairobi",
      loyaltySpendPerPoint: 100,
    },
    create: {
      slug: MAJID_SLUG,
      name: "Majid Restaurant",
      tagline: "Nakuru's home of biryani — breakfast through dinner",
      description:
        "Family-run Kenyan-Indian restaurant in the heart of Nakuru CBD. " +
        "Serving full breakfast, lunch, and dinner with dine-in, takeaway, and delivery. " +
        "Famous for our chicken and mutton biryani, freshly baked chapati, and house-made mango lassi.",
      whatsappPhone: "254712345678",
      contactPhone: "+254 712 345 678",
      contactEmail: "hello@majidrestaurant.co.ke",
      address: "Kenyatta Avenue, Nakuru CBD, Nakuru, Kenya",
      latitude: -0.3031,
      longitude: 36.08,
      parkingInfo:
        "Street parking on Kenyatta Avenue. Paid basement parking at Westside Mall (200m walk).",
      logoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop",
      coverImageUrl:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&h=900&fit=crop",
      hasEventSpace: true,
      comboBuilderEnabled: true,
      currency: "KES",
      timezone: "Africa/Nairobi",
      loyaltySpendPerPoint: 100,
    },
  });

  // ── Branch ───────────────────────────────────────────────
  const existingBranch = await db.branch.findFirst({
    where: { restaurantId: restaurant.id, name: "Nakuru CBD" },
  });
  const branch =
    existingBranch ??
    (await db.branch.create({
      data: {
        restaurantId: restaurant.id,
        name: "Nakuru CBD",
        address: "Kenyatta Avenue, Nakuru CBD, Nakuru, Kenya",
        latitude: -0.3031,
        longitude: 36.08,
        contactPhone: "+254 712 345 678",
        isActive: true,
      },
    }));

  // ── Operating Hours ──────────────────────────────────────
  // Open Mon-Sun, 07:00–22:00.
  const hoursRows = Array.from({ length: 7 }, (_, dow) => ({
    restaurantId: restaurant.id,
    dayOfWeek: dow,
    openTime: "07:00",
    closeTime: "22:00",
    isClosed: false,
  }));
  await db.operatingHours.deleteMany({ where: { restaurantId: restaurant.id } });
  for (const row of hoursRows) {
    await db.operatingHours.upsert({
      where: {
        restaurantId_dayOfWeek: {
          restaurantId: row.restaurantId,
          dayOfWeek: row.dayOfWeek,
        },
      },
      update: { openTime: row.openTime, closeTime: row.closeTime, isClosed: row.isClosed },
      create: row,
    });
  }

  // One upcoming override for demo: Eid holiday closed.
  const eidDate = new Date();
  eidDate.setDate(eidDate.getDate() + 21);
  eidDate.setHours(0, 0, 0, 0);
  await db.operatingHoursOverride.upsert({
    where: { restaurantId_date: { restaurantId: restaurant.id, date: eidDate } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      date: eidDate,
      isClosed: true,
      reason: "Public Holiday (Eid al-Adha)",
    },
  });

  // ── Categories ───────────────────────────────────────────
  await db.menuCategory.deleteMany({ where: { restaurantId: restaurant.id } });
  const categories = await db.menuCategory.createMany({
    data: [
      { restaurantId: restaurant.id, name: "Breakfast", sortOrder: 0, isActive: true },
      { restaurantId: restaurant.id, name: "Biryani & Rice", sortOrder: 1, isActive: true },
      { restaurantId: restaurant.id, name: "Grills & BBQ", sortOrder: 2, isActive: true },
      { restaurantId: restaurant.id, name: "Drinks", sortOrder: 3, isActive: true },
      { restaurantId: restaurant.id, name: "Desserts", sortOrder: 4, isActive: true },
    ],
  });
  const categoryRows = await db.menuCategory.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { sortOrder: "asc" },
  });
  const cat = (name: string) => categoryRows.find((c) => c.name === name)!;

  // ── Menu Items ───────────────────────────────────────────
  type SeedItem = {
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
    isPopular?: boolean;
    isVegetarian?: boolean;
    isVegan?: boolean;
    isSpicy?: boolean;
    isHalal?: boolean;
    isAvailable?: boolean;
    tags?: string[];
    mealBuilderStage?: "base" | "protein" | "drink" | "dessert";
  };

  const items: SeedItem[] = [
    // ── Breakfast ────────────────────────────────────────
    {
      name: "Mandazi & Mahamri Platter",
      description:
        "Freshly fried mandazi and mahamri served with a side of bean stew and chilli sauce. A Nakuru morning classic.",
      price: 250,
      imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&h=600&fit=crop",
      category: "Breakfast",
      isVegetarian: true,
      tags: ["breakfast", "sweet", "fried", "kenyan"],
      isPopular: true,
    },
    {
      name: "Chapati & Ndengu",
      description:
        "Two flaky chapatis served with a hearty green-gram (ndengu) stew. Vegetarian, filling, and our most-ordered breakfast.",
      price: 220,
      imageUrl: "https://images.unsplash.com/photo-1631292784640-2b24be784d5d?w=800&h=600&fit=crop",
      category: "Breakfast",
      isVegetarian: true,
      tags: ["breakfast", "vegetarian", "stew", "kenyan"],
      isPopular: true,
    },
    {
      name: "Mayai Pasua",
      description:
        "Three eggs fried with onions, tomatoes, and capsicum — served with kachumbari and two slices of toast.",
      price: 200,
      imageUrl: "https://images.unsplash.com/photo-1525351484163-7520b7d0ce06?w=800&h=600&fit=crop",
      category: "Breakfast",
      tags: ["breakfast", "eggs", "kenyan"],
    },
    {
      name: "Maharage Ya Nazi",
      description:
        "Slow-cooked kidney beans in coconut milk, served with rice or chapati. Vegan-friendly and full of East-African flavour.",
      price: 230,
      imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=600&fit=crop",
      category: "Breakfast",
      isVegetarian: true,
      isVegan: true,
      tags: ["breakfast", "vegan", "beans", "coconut"],
    },

    // ── Biryani & Rice ───────────────────────────────────
    {
      name: "Chicken Biryani",
      description:
        "Our signature dish. Basmati rice layered with marinated chicken, saffron, fried onions, and whole spices — sealed and slow-cooked dum-style. Served with raita and kachumbari.",
      price: 450,
      imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&h=600&fit=crop",
      category: "Biryani & Rice",
      isSpicy: true,
      tags: ["biryani", "spicy", "signature", "indian", "rice", "chicken"],
      isPopular: true,
      mealBuilderStage: "base",
    },
    {
      name: "Mutton Biryani",
      description:
        "Slow-cooked mutton layered with basmati, saffron, and a special blend of 14 spices. Falls off the bone.",
      price: 550,
      imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&h=600&fit=crop",
      category: "Biryani & Rice",
      isSpicy: true,
      tags: ["biryani", "spicy", "mutton", "signature", "indian", "rice"],
      isPopular: true,
    },
    {
      name: "Vegetable Biryani",
      description:
        "Garden vegetables, paneer, and basmati rice layered with biryani spices. Vegetarian — and arguably as good as the chicken.",
      price: 380,
      imageUrl: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&h=600&fit=crop",
      category: "Biryani & Rice",
      isVegetarian: true,
      isSpicy: true,
      tags: ["biryani", "vegetarian", "spicy", "indian", "rice"],
      mealBuilderStage: "base",
    },
    {
      name: "Pilau Nyama",
      description:
        "Spiced pilau rice with tender beef, carrots, and potatoes. Served with kachumbari and a side of broth.",
      price: 380,
      imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=600&fit=crop",
      category: "Biryani & Rice",
      isSpicy: true,
      tags: ["pilau", "beef", "spicy", "kenyan", "rice"],
    },
    {
      name: "Plain Steamed Rice",
      description: "A simple plate of long-grain white steamed rice. The base for any curry.",
      price: 120,
      imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&h=600&fit=crop",
      category: "Biryani & Rice",
      isVegetarian: true,
      isVegan: true,
      tags: ["rice", "side", "plain"],
      mealBuilderStage: "base",
    },
    {
      name: "Coconut Rice",
      description: "Basmati cooked in fresh coconut milk with curry leaves and cashew.",
      price: 180,
      imageUrl: "https://images.unsplash.com/photo-1604908554007-1e90fe6a8b6a?w=800&h=600&fit=crop",
      category: "Biryani & Rice",
      isVegetarian: true,
      tags: ["rice", "coconut", "indian"],
    },

    // ── Grills & BBQ ─────────────────────────────────────
    {
      name: "Nyama Choma (Goat)",
      description:
        "Half-kilo of dry-rubbed goat shoulder roasted over open flame. Served with kachumbari, ugali, and a chilli-salt dip. Allow 30 minutes.",
      price: 700,
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop",
      category: "Grills & BBQ",
      tags: ["grill", "bbq", "goat", "kenyan"],
      isPopular: true,
      mealBuilderStage: "protein",
    },
    {
      name: "Grilled Chicken Tikka",
      description:
        "Yoghurt-marinated chicken tikka grilled in the tandoor. Served with mint chutney and lemon.",
      price: 500,
      imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&h=600&fit=crop",
      category: "Grills & BBQ",
      isSpicy: true,
      tags: ["grill", "tandoor", "chicken", "indian", "spicy"],
      mealBuilderStage: "protein",
    },
    {
      name: "Beef Mishkaki",
      description:
        "Tender beef cubes marinated in a Coastal-Swahili spice blend, skewered and grilled. 6 skewers.",
      price: 480,
      imageUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&h=600&fit=crop",
      category: "Grills & BBQ",
      isSpicy: true,
      tags: ["grill", "skewer", "beef", "swahili", "spicy"],
      mealBuilderStage: "protein",
    },
    {
      name: "Tandoori Fish",
      description: "Whole tilapia marinated in tandoori spices and grilled. Comes with naan.",
      price: 620,
      imageUrl: "https://images.unsplash.com/photo-1535400875775-0d9fb1b2b94f?w=800&h=600&fit=crop",
      category: "Grills & BBQ",
      isSpicy: true,
      tags: ["grill", "fish", "tandoori", "spicy"],
      isAvailable: false, // demo: sold-out display
    },

    // ── Drinks ───────────────────────────────────────────
    {
      name: "Mango Lassi",
      description: "House-made yoghurt blended with sweet Alphonso mango. Cold, thick, refreshing.",
      price: 150,
      imageUrl: "https://images.unsplash.com/photo-1626078436898-7c2c9f10d91d?w=800&h=600&fit=crop",
      category: "Drinks",
      isVegetarian: true,
      tags: ["drink", "mango", "lassi", "indian", "cold"],
      isPopular: true,
      mealBuilderStage: "drink",
    },
    {
      name: "Dawa",
      description:
        "Kenyan classic — vodka, honey, and lime. Comes with the iconic dawa stick to stir the honey in.",
      price: 350,
      imageUrl: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&h=600&fit=crop",
      category: "Drinks",
      tags: ["drink", "cocktail", "kenyan", "alcohol"],
      mealBuilderStage: "drink",
    },
    {
      name: "Fresh Passion Juice",
      description: "Freshly squeezed passion-fruit juice, no added sugar.",
      price: 180,
      imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&h=600&fit=crop",
      category: "Drinks",
      isVegan: true,
      isVegetarian: true,
      tags: ["drink", "juice", "fresh", "kenyan"],
      mealBuilderStage: "drink",
    },
    {
      name: "Tusker Lager (500ml)",
      description: "Kenya's beer. Cold.",
      price: 250,
      imageUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=600&fit=crop",
      category: "Drinks",
      tags: ["drink", "beer", "kenyan", "alcohol"],
    },
    {
      name: "Karibu Chai (Masala Tea)",
      description: "Black tea simmered with milk, ginger, cardamom, and cloves.",
      price: 100,
      imageUrl: "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=800&h=600&fit=crop",
      category: "Drinks",
      isVegetarian: true,
      tags: ["drink", "tea", "chai", "hot", "kenyan"],
    },

    // ── Desserts ─────────────────────────────────────────
    {
      name: "Kheer (Rice Pudding)",
      description: "Slow-simmered basmati in cardamom milk, topped with pistachio and raisins.",
      price: 200,
      imageUrl: "https://images.unsplash.com/photo-1605197788044-5a32c7078486?w=800&h=600&fit=crop",
      category: "Desserts",
      isVegetarian: true,
      tags: ["dessert", "sweet", "indian", "rice"],
      isPopular: true,
      mealBuilderStage: "dessert",
    },
    {
      name: "Mango Kulfi",
      description: "Indian-style frozen mango cream, sliced. Topped with crushed pistachio.",
      price: 220,
      imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&h=600&fit=crop",
      category: "Desserts",
      isVegetarian: true,
      tags: ["dessert", "sweet", "mango", "ice-cream", "indian"],
      mealBuilderStage: "dessert",
    },
    {
      name: "Coconut Macoon",
      description: "Chewy East-African coconut cookie. Three pieces.",
      price: 150,
      imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&h=600&fit=crop",
      category: "Desserts",
      isVegetarian: true,
      tags: ["dessert", "cookie", "coconut", "kenyan"],
      mealBuilderStage: "dessert",
    },
  ];

  await db.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });
  for (const item of items) {
    await db.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: cat(item.category).id,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable ?? true,
        isPopular: item.isPopular ?? false,
        isVegetarian: item.isVegetarian ?? false,
        isVegan: item.isVegan ?? false,
        isSpicy: item.isSpicy ?? false,
        isHalal: item.isHalal ?? true,
        tagsJson: serializeTags(item.tags ?? []),
        mealBuilderStage: item.mealBuilderStage ?? null,
      },
    });
  }
  console.log(`  ✓ Inserted ${items.length} menu items`);

  // ── Promotions (homepage banner carousel — PRD §5.12) ────
  await db.promotion.deleteMany({ where: { restaurantId: restaurant.id } });
  const now = new Date();
  const inDays = (d: number) => new Date(Date.now() + d * 86400_000);
  await db.promotion.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        title: "Friday Biryani Special",
        description: "Order any biryani on Friday and get a free mango lassi.",
        imageUrl:
          "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1600&h=600&fit=crop",
        startDate: inDays(-3),
        endDate: inDays(14),
        isActive: true,
        sortOrder: 0,
      },
      {
        restaurantId: restaurant.id,
        title: "Ramadan Iftar Combo",
        description: "Family iftar: 2 biryani + 4 drinks + 1 dessert. KSh 1,800 (save KSh 360).",
        imageUrl:
          "https://images.unsplash.com/photo-1604908554007-1e90fe6a8b6a?w=1600&h=600&fit=crop",
        startDate: inDays(-1),
        endDate: inDays(20),
        isActive: true,
        sortOrder: 1,
      },
      {
        restaurantId: restaurant.id,
        title: "Family Combo Sunday",
        description: "Nyama choma + ugali + 4 drinks for the whole family. KSh 1,500.",
        imageUrl:
          "https://images.unsplash.com/photo-1544025162-d76694265947?w=1600&h=600&fit=crop",
        startDate: inDays(-7),
        endDate: inDays(7),
        isActive: true,
        sortOrder: 2,
      },
    ],
  });
  console.log(`  ✓ Inserted 3 promotions`);

  // ── Gallery (PRD §5.20) ──────────────────────────────────
  await db.galleryImage.deleteMany({ where: { restaurantId: restaurant.id } });
  const galleryImages = [
    { url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&h=700&fit=crop", caption: "Our dining room", category: "interior" },
    { url: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=900&h=700&fit=crop", caption: "Evening service", category: "interior" },
    { url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&h=700&fit=crop", caption: "The pass", category: "interior" },
    { url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=900&h=700&fit=crop", caption: "Chicken biryani", category: "food" },
    { url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=900&h=700&fit=crop", caption: "Mutton biryani", category: "food" },
    { url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=900&h=700&fit=crop", caption: "Nyama choma fresh off the grill", category: "food" },
    { url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=900&h=700&fit=crop", caption: "Morning mandazi", category: "food" },
    { url: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=900&h=700&fit=crop", caption: "Veg biryani", category: "food" },
    { url: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=900&h=700&fit=crop", caption: "Steamed rice", category: "food" },
    { url: "https://images.unsplash.com/photo-1605197788044-5a32c7078486?w=900&h=700&fit=crop", caption: "Kheer", category: "food" },
    { url: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=900&h=700&fit=crop", caption: "Chef Yusuf plating", category: "staff" },
    { url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&h=700&fit=crop", caption: "Service team", category: "staff" },
  ];
  await db.galleryImage.createMany({
    data: galleryImages.map((g, i) => ({
      restaurantId: restaurant.id,
      imageUrl: g.url,
      caption: g.caption,
      category: g.category,
      sortOrder: i,
    })),
  });
  console.log(`  ✓ Inserted ${galleryImages.length} gallery images`);

  // ── Reviews (PRD §5.10 — Phase 2, but seeded for homepage preview) ──
  await db.review.deleteMany({ where: { restaurantId: restaurant.id } });
  await db.review.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        rating: 5,
        comment:
          "Best biryani in Nakuru, hands down. The mutton falls off the bone and the portion is huge.",
        isPublished: true,
      },
      {
        restaurantId: restaurant.id,
        rating: 5,
        comment:
          "Came for breakfast — chapati and ndengu hit the spot. Service was quick and friendly.",
        isPublished: true,
      },
      {
        restaurantId: restaurant.id,
        rating: 4,
        comment:
          "Nyama choma was perfect, just had to wait 30 minutes as warned. Worth it.",
        isPublished: true,
      },
      {
        restaurantId: restaurant.id,
        rating: 5,
        comment: "Mango lassi is the best I've had outside Mombasa. Will be back!",
        isPublished: true,
      },
    ],
  });
  console.log(`  ✓ Inserted 4 reviews`);

  // ── About content (PRD §5.21) ────────────────────────────
  await db.aboutContent.upsert({
    where: { restaurantId: restaurant.id },
    update: {
      story:
        "Majid Restaurant started in 2007 as a single-room kiosk on Kenyatta Avenue, serving breakfast chapatis to matatu drivers on the early shift. Today, the dining room seats 80 and we serve over 600 plates a day — but the recipes haven't changed. We still grind our own biryani spice mix every morning, still buy our goat from the same Bahati farm, and still serve the same kind of welcome that kept those drivers coming back.",
      mission:
        "To be Nakuru's most-loved family restaurant — a place where everyone from a CEO on lunch break to a matatu driver on tea break gets the same plate, the same smile, and the same fair price.",
      hygieneStandards:
        "All food handlers carry current food-safety certificates from Nakuru County. Surfaces are sanitised every 30 minutes during service. Cooking oil is changed daily. Our kitchen is open-view — ask any server and they'll walk you back to see it.",
      sourcing:
        "Goat and beef: Bahati Farmers Cooperative. Chicken: Kenchic. Produce: Nakuru Wakulima Market, daily. Mangoes for lassi: Coastal Kenya, Alphonso variety when in season. Spices: imported direct from Zanzibar and India.",
    },
    create: {
      restaurantId: restaurant.id,
      story:
        "Majid Restaurant started in 2007 as a single-room kiosk on Kenyatta Avenue, serving breakfast chapatis to matatu drivers on the early shift. Today, the dining room seats 80 and we serve over 600 plates a day — but the recipes haven't changed. We still grind our own biryani spice mix every morning, still buy our goat from the same Bahati farm, and still serve the same kind of welcome that kept those drivers coming back.",
      mission:
        "To be Nakuru's most-loved family restaurant — a place where everyone from a CEO on lunch break to a matatu driver on tea break gets the same plate, the same smile, and the same fair price.",
      hygieneStandards:
        "All food handlers carry current food-safety certificates from Nakuru County. Surfaces are sanitised every 30 minutes during service. Cooking oil is changed daily. Our kitchen is open-view — ask any server and they'll walk you back to see it.",
      sourcing:
        "Goat and beef: Bahati Farmers Cooperative. Chicken: Kenchic. Produce: Nakuru Wakulima Market, daily. Mangoes for lassi: Coastal Kenya, Alphonso variety when in season. Spices: imported direct from Zanzibar and India.",
    },
  });
  console.log(`  ✓ Upserted about content`);

  // ── Restaurant tables (for QR code Phase 3, schema here for completeness) ──
  await db.restaurantTable.deleteMany({ where: { restaurantId: restaurant.id } });
  const tables = Array.from({ length: 12 }, (_, i) => ({
    restaurantId: restaurant.id,
    branchId: branch.id,
    label: `Table ${i + 1}`,
    capacity: i < 4 ? 2 : i < 9 ? 4 : 6,
    location: i < 8 ? "indoor" : "outdoor",
  }));
  await db.restaurantTable.createMany({ data: tables });
  console.log(`  ✓ Inserted ${tables.length} tables`);

  // ── Phase 2 seed data ─────────────────────────────────────
  // Staff user (OWNER) for the admin dashboard login.
  // Demo customer account for the customer sign-in flow.
  const bcrypt = (await import("bcryptjs")).default;

  await db.staffUser.deleteMany({ where: { restaurantId: restaurant.id } });
  await db.staffUser.create({
    data: {
      restaurantId: restaurant.id,
      name: "Majid (Owner)",
      email: "owner@majid.com",
      role: "OWNER",
      isActive: true,
      passwordHash: await bcrypt.hash("majid-owner-2024", 10),
    },
  });
  await db.staffUser.create({
    data: {
      restaurantId: restaurant.id,
      name: "Aisha (Manager)",
      email: "manager@majid.com",
      role: "MANAGER",
      isActive: true,
      passwordHash: await bcrypt.hash("majid-manager-2024", 10),
    },
  });
  await db.staffUser.create({
    data: {
      restaurantId: restaurant.id,
      name: "Yusuf (Kitchen)",
      email: "kitchen@majid.com",
      role: "KITCHEN",
      isActive: true,
      passwordHash: await bcrypt.hash("majid-kitchen-2024", 10),
    },
  });
  console.log(`  ✓ Inserted 3 staff users (owner@majid.com / manager@majid.com / kitchen@majid.com)`);

  // Demo customer — used by the customer sign-in flow on /<slug>/sign-in.
  await db.customer.deleteMany({ where: { restaurantId: restaurant.id } });
  const demoCustomer = await db.customer.create({
    data: {
      restaurantId: restaurant.id,
      email: "aisha@example.com",
      name: "Aisha Mohamed",
      phone: "+254712345678",
      passwordHash: await bcrypt.hash("aisha-demo-2024", 10),
    },
  });
  console.log(`  ✓ Inserted 1 demo customer (aisha@example.com / aisha-demo-2024)`);

  // Sample completed order so the admin dashboard isn't empty on first load.
  // Marks the demo customer as having a completed order — reviewable.
  const chickenBiryani = await db.menuItem.findFirst({
    where: { restaurantId: restaurant.id, name: "Chicken Biryani" },
  });
  const mangoLassi = await db.menuItem.findFirst({
    where: { restaurantId: restaurant.id, name: "Mango Lassi" },
  });
  if (chickenBiryani && mangoLassi) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sampleOrder = await db.order.create({
      data: {
        restaurantId: restaurant.id,
        branchId: branch.id,
        customerId: demoCustomer.id,
        guestName: "Aisha Mohamed",
        guestPhone: "+254712345678",
        status: "COMPLETED",
        fulfillmentType: "DELIVERY",
        scheduledFor: null,
        deliveryAddress: "House 12, Section 58, Nakuru",
        specialInstructions: "Extra spicy please",
        subtotal: 1050,
        total: 1050,
        paymentMethod: "MPESA",
        paidAt: yesterday,
        createdAt: yesterday,
        items: {
          create: [
            { menuItemId: chickenBiryani.id, quantity: 2, unitPrice: 450, notes: "extra spicy" },
            { menuItemId: mangoLassi.id, quantity: 1, unitPrice: 150, notes: null },
          ],
        },
      },
    });
    console.log(`  ✓ Inserted 1 sample completed order (#${sampleOrder.id.slice(-6).toUpperCase()})`);

    // Sample review from that completed order — pending moderation so the
    // owner sees something to action on the admin reviews page.
    await db.review.create({
      data: {
        restaurantId: restaurant.id,
        customerId: demoCustomer.id,
        orderId: sampleOrder.id,
        rating: 5,
        comment: "The chicken biryani was even better than last time. Extra spicy as requested. Mango lassi was perfect.",
        isPublished: false,
      },
    });
    console.log(`  ✓ Inserted 1 sample review (pending moderation)`);
  }

  // Sample catering inquiry so the admin catering list isn't empty.
  await db.cateringInquiry.create({
    data: {
      restaurantId: restaurant.id,
      contactName: "Janet Wanjiru",
      contactPhone: "+254722987654",
      contactEmail: "janet@acmecorp.co.ke",
      eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      guestCount: 80,
      budgetRange: "KSh 50,000 - 100,000",
      preferredCuisine: "Biryani + nyama choma + vegetarian options",
      eventType: "corporate",
      notes: "Annual staff party. Need serving staff and clean-up.",
      status: "NEW",
    },
  });
  console.log(`  ✓ Inserted 1 sample catering inquiry`);

  // Sample upcoming reservation.
  const tomorrow5pm = new Date();
  tomorrow5pm.setDate(tomorrow5pm.getDate() + 1);
  tomorrow5pm.setHours(17, 0, 0, 0);
  await db.reservation.create({
    data: {
      restaurantId: restaurant.id,
      branchId: branch.id,
      guestName: "James Kamau",
      guestPhone: "+254733456789",
      partySize: 4,
      reservedFor: tomorrow5pm,
      occasion: "birthday",
      seatingPref: "indoor",
      notes: "Bringing a birthday cake — need a small table near the window.",
      status: "PENDING",
    },
  });
  console.log(`  ✓ Inserted 1 sample reservation`);

  // ── Phase 3 seed data ────────────────────────────────────

  // Loyalty rules — three sample rewards of different shapes so the admin
  // UI has something to show on first load.
  await db.loyaltyRule.deleteMany({ where: { restaurantId: restaurant.id } });
  await db.loyaltyRule.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        description: "Free mango lassi",
        pointsRequired: 50,
        spendThreshold: null,
        rewardDescription: "Complimentary mango lassi on your next order.",
        isActive: true,
      },
      {
        restaurantId: restaurant.id,
        description: "KSh 200 off your next order",
        pointsRequired: 100,
        spendThreshold: null,
        rewardDescription: "KSh 200 discount voucher, redeemable once.",
        isActive: true,
      },
      {
        restaurantId: restaurant.id,
        description: "Free dessert with family combo",
        pointsRequired: null,
        spendThreshold: 5000,
        rewardDescription: "Free dessert of the day when you spend KSh 5,000+ in a single order.",
        isActive: true,
      },
    ],
  });
  console.log(`  ✓ Inserted 3 loyalty rules`);

  // Loyalty ledger: accrue points for the sample completed order from Phase 2.
  // This makes the demo customer's account page show a non-zero balance + an
  // entry in the recent activity list, so the loyalty feature visibly works
  // on first load.
  await db.loyaltyPointLedger.deleteMany({ where: { restaurantId: restaurant.id } });
  if (chickenBiryani && mangoLassi) {
    // Re-lookup the completed order (we created it above with status COMPLETED).
    const completedOrders = await db.order.findMany({
      where: { restaurantId: restaurant.id, status: "COMPLETED", customerId: demoCustomer.id },
      take: 1,
    });
    for (const o of completedOrders) {
      const pointsEarned = Math.floor(o.total / 100); // matches loyaltySpendPerPoint = 100
      if (pointsEarned > 0) {
        await db.loyaltyPointLedger.create({
          data: {
            restaurantId: restaurant.id,
            customerId: demoCustomer.id,
            entryType: "ACCRUAL",
            points: pointsEarned,
            balanceAfter: pointsEarned,
            orderId: o.id,
            description: `Earned from order #${o.id.slice(-6).toUpperCase()} (KSh ${Math.round(o.total)})`,
            createdAt: o.createdAt,
          },
        });
        await db.customer.update({
          where: { id: demoCustomer.id },
          data: { loyaltyPoints: pointsEarned },
        });
        console.log(`  ✓ Accrued ${pointsEarned} loyalty points for demo customer`);
      }
    }
  }

  // Sample event booking (NEW status) so the admin events page has data.
  await db.eventBooking.deleteMany({ where: { restaurantId: restaurant.id } });
  await db.eventBooking.create({
    data: {
      restaurantId: restaurant.id,
      contactName: "Sarah Wambui",
      contactPhone: "+254722111222",
      eventDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      durationHours: 5,
      guestCount: 60,
      setupNeeds: "Projector + screen, 8 round tables of 8, PA system, separate buffet area",
      status: "NEW",
    },
  });
  console.log(`  ✓ Inserted 1 sample event booking`);

  // Job postings + 1 sample application so the admin careers page has data.
  await db.jobApplication.deleteMany({});
  await db.jobPosting.deleteMany({ where: { restaurantId: restaurant.id } });
  const chefPosting = await db.jobPosting.create({
    data: {
      restaurantId: restaurant.id,
      title: "Senior Chef de Partie",
      description:
        "We're looking for an experienced chef de partie to lead our biryani and grill section.\n\n" +
        "What you'll do:\n" +
        "• Prep and cook biryani, nyama choma, and curries to spec\n" +
        "• Lead a 3-cook section during service\n" +
        "• Train junior staff on plating and portion control\n" +
        "• Maintain food safety standards (we're Nakuru County-certified)\n\n" +
        "Requirements:\n" +
        "• 3+ years in a similar role (hotel or busy restaurant)\n" +
        "• Food safety certificate\n" +
        "• Available for evening + weekend shifts\n\n" +
        "Compensation: KSh 35,000–45,000/month + tips + staff meal.",
      isActive: true,
    },
  });
  const waiterPosting = await db.jobPosting.create({
    data: {
      restaurantId: restaurant.id,
      title: "Waiter / Waitress",
      description:
        "Front-of-house role serving breakfast, lunch, and dinner service.\n\n" +
        "What you'll do:\n" +
        "• Take orders, serve food, handle bills\n" +
        "• Set up and clear tables\n" +
        "• Help with reservations and walk-ins\n\n" +
        "Requirements:\n" +
        "• 1+ year hospitality experience\n" +
        "• Friendly, punctual, presentable\n" +
        "• Swahili + basic English\n\n" +
        "Compensation: KSh 18,000–22,000/month + tips + staff meal.",
      isActive: true,
    },
  });
  console.log(`  ✓ Inserted 2 job postings`);

  // Sample application on the chef posting so the admin list isn't empty.
  await db.jobApplication.create({
    data: {
      jobPostingId: chefPosting.id,
      applicantName: "Peter Mwangi",
      applicantPhone: "+254712998877",
      applicantEmail: "peter.mwangi@example.com",
      cvUrl: "", // no CV uploaded in seed
    },
  });
  console.log(`  ✓ Inserted 1 sample job application`);

  // Touch the waiter posting to make sure both have entries in the DB.
  void waiterPosting;

  console.log(`\n→ Seed complete. Visit /${MAJID_SLUG} to view the demo.`);
  console.log(`→ Admin: /${MAJID_SLUG}/admin/sign-in (owner@majid.com / majid-owner-2024)`);
  console.log(`→ Kitchen: /${MAJID_SLUG}/admin/kitchen (kitchen@majid.com / majid-kitchen-2024)`);
}

main()
  .catch((e) => {
    console.error("✗ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
