const fs = require('fs');
const file = 'prisma/seed.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "  // ── Categories ───────────────────────────────────────────\n  await db.menuCategory.deleteMany({ where: { restaurantId: restaurant.id } });",
  "  // ── Categories ───────────────────────────────────────────\n  await db.order.deleteMany({ where: { restaurantId: restaurant.id } });\n  await db.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });\n  await db.menuCategory.deleteMany({ where: { restaurantId: restaurant.id } });"
);

content = content.replace(
  "  await db.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });\n  for (const item of items) {",
  "  for (const item of items) {"
);

fs.writeFileSync(file, content);
console.log('patched');
