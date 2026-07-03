/**
 * WhatsApp ordering helper (PRD §5.6).
 *
 * v1 is client-side only: generate a structured wa.me deep link with a
 * pre-filled message. No webhook, no delivery confirmation, no API cost.
 * The message template mirrors the discovery doc example exactly so staff
 * receiving it don't need training on a new format.
 */

export type WhatsAppOrderLine = {
  name: string;
  quantity: number;
  unitPrice?: number; // optional, included if known
};

export type WhatsAppOrderPayload = {
  restaurantName: string;
  whatsappPhone: string; // E.164, e.g. "254790670542"
  customerName: string;
  customerPhone: string;
  fulfillmentType: "DELIVERY" | "PICKUP" | "DINE_IN";
  scheduledFor?: string | null; // human-readable time, or "As soon as possible"
  deliveryAddress?: string | null;
  tableLabel?: string | null; // for DINE_IN
  items: WhatsAppOrderLine[];
  specialInstructions?: string | null;
  total?: number; // optional, included if known
};

const FULFILLMENT_LABEL: Record<WhatsAppOrderPayload["fulfillmentType"], string> = {
  DELIVERY: "Delivery",
  PICKUP: "Pickup",
  DINE_IN: "Dine-in",
};

/**
 * Build the structured message body exactly per the discovery template.
 * Example output:
 *
 *   *Majid Restaurant — New Order*
 *
 *   Name: Aisha M.
 *   Phone: 0712 345 678
 *   Fulfillment: Delivery
 *   Time: As soon as possible
 *   Address: 12 Kenyatta Ave, Nakuru
 *
 *   Order:
 *   • 2× Chicken Biryani — KSh 350
 *   • 1× Mango Lassi — KSh 150
 *
 *   Special instructions: Extra spicy please
 *
 *   Total: KSh 850
 */
export function buildWhatsAppOrderMessage(p: WhatsAppOrderPayload): string {
  const lines: string[] = [];
  lines.push(`*${p.restaurantName} — New Order*`);
  lines.push("");
  lines.push(`Name: ${p.customerName}`);
  lines.push(`Phone: ${p.customerPhone}`);
  lines.push(`Fulfillment: ${FULFILLMENT_LABEL[p.fulfillmentType]}`);

  if (p.scheduledFor && p.scheduledFor !== "As soon as possible") {
    lines.push(`Time: ${p.scheduledFor}`);
  } else {
    lines.push("Time: As soon as possible");
  }

  if (p.fulfillmentType === "DELIVERY" && p.deliveryAddress) {
    lines.push(`Address: ${p.deliveryAddress}`);
  }
  if (p.fulfillmentType === "DINE_IN" && p.tableLabel) {
    lines.push(`Table: ${p.tableLabel}`);
  }

  lines.push("");
  lines.push("Order:");
  for (const item of p.items) {
    const pricePart =
      typeof item.unitPrice === "number"
        ? ` — KSh ${formatKsh(item.unitPrice)}`
        : "";
    lines.push(`• ${item.quantity}× ${item.name}${pricePart}`);
  }

  if (p.specialInstructions && p.specialInstructions.trim()) {
    lines.push("");
    lines.push(`Special instructions: ${p.specialInstructions}`);
  }

  if (typeof p.total === "number") {
    lines.push("");
    lines.push(`Total: KSh ${formatKsh(p.total)}`);
  }

  return lines.join("\n");
}

/**
 * Build a single-item "Order via WhatsApp" message — used on individual menu
 * cards so a diner can fire off a quick order without going through a full cart.
 */
export function buildSingleItemWhatsAppMessage(args: {
  restaurantName: string;
  itemName: string;
  quantity: number;
  customerName?: string;
  customerPhone?: string;
}): string {
  const lines: string[] = [];
  lines.push(`*${args.restaurantName} — Order Request*`);
  lines.push("");
  if (args.customerName) lines.push(`Name: ${args.customerName}`);
  if (args.customerPhone) lines.push(`Phone: ${args.customerPhone}`);
  lines.push("");
  lines.push("Order:");
  lines.push(`• ${args.quantity}× ${args.itemName}`);
  return lines.join("\n");
}

/**
 * Construct the full wa.me URL.
 * `whatsappPhone` must be E.164 without leading `+` (e.g. "254790670542").
 */
export function buildWhatsAppUrl(whatsappPhone: string, message: string): string {
  const normalized = whatsappPhone.replace(/[^\d]/g, "");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function formatKsh(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}
