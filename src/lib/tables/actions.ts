/**
 * Restaurant tables + QR code server actions (PRD §5.24 — QR Code Table Menus).
 *
 * Phase 3 ships:
 *   - listTables (staff)              — for /admin/tables
 *   - upsertTable / deleteTable       — CRUD
 *   - getTableByShortCode (public)    — resolves /<slug>/table/<shortCode>
 *                                        (shortCode is the last 8 chars of the
 *                                        table ID; the QR encodes the URL so
 *                                        the customer never types it)
 *   - generateQrCodeDataUrl           — returns a base64 PNG for one table
 *   - generateQrPrintSheet            — returns a printable HTML sheet with
 *                                        all tables' QR codes for the owner
 *                                        to print + laminate (PRD §5.24)
 *
 * The QR encodes the URL `https://<host>/<slug>/table/<tableId>` so a diner
 * scanning it lands directly on the dine-in menu flow with the table
 * pre-selected.
 */
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { requireStaff } from "@/lib/auth/staff";
import { headers } from "next/headers";

// ── Public: resolve a table from its short code ─────────────────────────────

export type PublicTable = {
  id: string;
  label: string;
  capacity: number;
  location: string | null;
};

/**
 * Resolve a table by its short code (the last 8 chars of its CUID). Used by
 * the /<slug>/table/[tableId] route — the URL bar shows the short code so
 * customers don't see a 24-char CUID, but the lookup matches the full ID's
 * suffix (the table ID is the only field with a 1:1 mapping to a short code
 * under one tenant).
 *
 * Tenant-safe: the lookup is done via `tenant.restaurantTable`, which scopes
 * the where clause by restaurantId.
 */
export async function getTableByShortCode(
  shortCode: string,
): Promise<PublicTable | null> {
  const { db: tenant } = await getContextRestaurant();
  // Match either the full ID or the last 8 chars. Most QR codes encode the
  // short form; manual links from admin may use the full ID.
  const table = await tenant.restaurantTable.findFirst({
    where: {
      OR: [
        { id: shortCode },
        // CUIDs are 24 chars; the last 8 are unique enough across one tenant's
        // table count (12 in the seed, will scale to thousands).
        // Postgres: endsWith is supported.
        ...(shortCode.length >= 6 && shortCode.length <= 10
          ? [{ id: { endsWith: shortCode } } as const]
          : []),
      ],
    },
  });
  if (!table) return null;
  return {
    id: table.id,
    label: table.label,
    capacity: table.capacity,
    location: table.location,
  };
}

// ── Staff: CRUD ─────────────────────────────────────────────────────────────

const UpsertTableSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(60),
  capacity: z.number().int().min(1).max(50),
  location: z.enum(["indoor", "outdoor"]).optional().nullable(),
  branchId: z.string().optional().nullable(),
});

export type TableResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function upsertTable(
  input: z.infer<typeof UpsertTableSchema>,
): Promise<TableResult<{ id: string }>> {
  const parsed = UpsertTableSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await requireStaff(["OWNER", "MANAGER", "FRONT_OF_HOUSE"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  const payload = {
    label: data.label,
    capacity: data.capacity,
    location: data.location ?? null,
    branchId: data.branchId ?? null,
  };

  let id: string;
  if (data.id) {
    const updated = await tenant.restaurantTable.update({
      where: { id: data.id },
      data: payload,
    });
    id = updated.id;
  } else {
    const created = await tenant.restaurantTable.create({ data: payload });
    id = created.id;
  }

  revalidatePath(`/${restaurant.slug}/admin/tables`);
  return { ok: true, data: { id } };
}

export async function deleteTable(id: string): Promise<TableResult<{ id: string }>> {
  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();
  await tenant.restaurantTable.delete({ where: { id } });
  revalidatePath(`/${restaurant.slug}/admin/tables`);
  return { ok: true, data: { id } };
}

export type AdminTable = {
  id: string;
  label: string;
  capacity: number;
  location: string | null;
  shortCode: string;
  branchName: string | null;
  qrDataUrl: string | null;
};

export async function listTables(): Promise<AdminTable[]> {
  await requireStaff(["OWNER", "MANAGER", "FRONT_OF_HOUSE", "KITCHEN"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  const tables = await tenant.restaurantTable.findMany({
    orderBy: { label: "asc" },
    include: { branch: { select: { name: true } } },
  });

  const baseUrl = await buildPublicBaseUrl();
  const slug = restaurant.slug;

  // Generate QR data URLs in parallel — they're tiny (a few KB each).
  const withQrs = await Promise.all(
    tables.map(async (t) => {
      const shortCode = t.id.slice(-8);
      const url = `${baseUrl}/${slug}/table/${shortCode}`;
      let qrDataUrl: string | null = null;
      try {
        qrDataUrl = await QRCode.toDataURL(url, {
          margin: 2,
          width: 512,
          color: { dark: "#1a1a1a", light: "#ffffff" },
        });
      } catch {
        qrDataUrl = null;
      }
      return {
        id: t.id,
        label: t.label,
        capacity: t.capacity,
        location: t.location,
        shortCode,
        branchName: t.branch?.name ?? null,
        qrDataUrl,
      };
    }),
  );

  return withQrs;
}

// ── QR generation helpers ───────────────────────────────────────────────────

/**
 * Build a public base URL for QR codes. In production this should be the
 * canonical restaurant domain. In dev we reconstruct from request headers.
 *
 * Note: this is best-effort. If behind a proxy without forwarded headers,
 * fall back to localhost:3000 — the QR will still work if the user opens it
 * on the same machine.
 */
async function buildPublicBaseUrl(): Promise<string> {
  // Allow override via env var — preferred for production deployments.
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    return `${proto}://${host}`;
  } catch {
    return "http://localhost:3000";
  }
}

/**
 * Server Action: generate a single QR data URL for a table. Used by the
 * admin tables page to render an inline QR preview.
 */
export async function generateQrForTable(
  tableId: string,
): Promise<TableResult<{ dataUrl: string; url: string }>> {
  await requireStaff(["OWNER", "MANAGER", "FRONT_OF_HOUSE"]);
  const { restaurant, db: tenant } = await getContextRestaurant();
  const table = await tenant.restaurantTable.findUnique({ where: { id: tableId } });
  if (!table) return { ok: false, error: "Table not found" };

  const baseUrl = await buildPublicBaseUrl();
  const shortCode = table.id.slice(-8);
  const url = `${baseUrl}/${restaurant.slug}/table/${shortCode}`;
  const dataUrl = await QRCode.toDataURL(url, {
    margin: 2,
    width: 512,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });
  return { ok: true, data: { dataUrl, url } };
}

/**
 * Server Action: render a printable HTML sheet of QR codes for all tables.
 * The admin clicks "Print QR sheet", this returns an HTML string, the
 * browser opens it in a new tab and the user prints from there.
 */
export async function generateQrPrintSheet(): Promise<TableResult<{ html: string }>> {
  await requireStaff(["OWNER", "MANAGER", "FRONT_OF_HOUSE"]);
  const { restaurant } = await getContextRestaurant();
  const tables = await listTables();

  const baseUrl = await buildPublicBaseUrl();
  const slug = restaurant.slug;

  const cards = tables
    .map((t) => {
      const url = `${baseUrl}/${slug}/table/${t.shortCode}`;
      // Re-generate at print resolution.
      return `
        <div class="card">
          <div class="card-label">${escapeHtml(t.label)}</div>
          <img src="${t.qrDataUrl ?? ""}" alt="QR for ${escapeHtml(t.label)}" />
          <div class="card-meta">${escapeHtml(restaurant.name)} · ${escapeHtml(t.location ?? "")}</div>
          <div class="card-url">${escapeHtml(url)}</div>
        </div>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(restaurant.name)} — Table QR codes</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; color: #1a1a1a; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #555; font-size: 13px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .card { border: 2px solid #1a1a1a; border-radius: 8px; padding: 12px; text-align: center; page-break-inside: avoid; }
  .card-label { font-weight: 700; font-size: 18px; margin-bottom: 8px; }
  .card img { width: 220px; height: 220px; display: block; margin: 0 auto; }
  .card-meta { font-size: 11px; color: #555; margin-top: 6px; }
  .card-url { font-family: monospace; font-size: 9px; color: #888; margin-top: 4px; word-break: break-all; }
  @media print { body { padding: 0; } .grid { grid-template-columns: repeat(3, 1fr); } }
</style>
</head>
<body>
  <h1>${escapeHtml(restaurant.name)} — Table QR codes</h1>
  <div class="sub">Print this sheet, cut along the card borders, and laminate one per table. Customers scan with their phone camera to view the menu and place a dine-in order.</div>
  <div class="grid">${cards}</div>
</body>
</html>`;

  return { ok: true, data: { html } };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
