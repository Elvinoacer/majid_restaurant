/**
 * M-Pesa Daraja STK Push integration (PRD §5.14).
 *
 * Direct integration with Safaricom's Daraja API — no aggregator. Supports
 * sandbox and production via MPESA_ENV. The flow per PRD:
 *
 *   1. Customer confirms order → server initiates STK Push.
 *   2. Customer enters M-Pesa PIN on their phone.
 *   3. Daraja callback hits /api/mpesa/callback (idempotent on
 *      `CheckoutRequestID` — Daraja retries callbacks).
 *   4. Order status updates → Socket.IO broadcast + FCM push.
 *
 * Required env vars (see .env.example):
 *   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE,
 *   MPESA_PASSKEY, MPESA_CALLBACK_URL, MPESA_ENV (sandbox|production),
 *   MPESA_INITIATOR_NAME (optional, for B2C / reversal flows — not used in v1)
 *
 * Sandbox credentials are free at https://developer.safaricom.co.ke.
 * Default sandbox shortcode is 174379. The callback URL must be publicly
 * reachable — for local dev use ngrok / cloudflared.
 */
import https from "node:https";

const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

/**
 * Get an OAuth access token from Daraja. Tokens live ~3600s; in production
 * we cache them, but for the demo flow we re-fetch per STK Push request to
 * keep the code path simple. (Each token fetch is one round-trip — acceptable
 * for the order volumes a single restaurant handles.)
 */
export async function getMpesaAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error("MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET not set");
  }

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const url = `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
    // Sandbox has a self-signed cert in some environments — allow it for dev.
    ...(process.env.MPESA_ENV !== "production"
      ? { agent: new https.Agent({ rejectUnauthorized: false }) }
      : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Daraja OAuth failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error(`Daraja OAuth returned no access_token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

/**
 * Generate the password for STK Push: base64(Shortcode + Passkey + Timestamp).
 * Timestamp format: YYYYMMDDHHmmss.
 */
function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

function nowTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/**
 * Normalize a Kenyan phone number to the format Daraja expects:
 *   2547XXXXXXXX (no leading +, no spaces). Accepts 07XXXXXXXX, +2547XXXXXXXX,
 *   2547XXXXXXXX, 7XXXXXXXX.
 */
export function normalizeMsisdn(input: string): string {
  let s = input.replace(/\D/g, "");
  if (s.startsWith("0")) s = "254" + s.slice(1);
  else if (s.startsWith("7") && s.length === 9) s = "254" + s;
  else if (s.startsWith("254")) {
    // already correct
  } else if (s.startsWith("+254")) {
    s = s.slice(1);
  }
  if (!/^254[17]\d{8}$/.test(s)) {
    throw new Error(`Invalid M-Pesa MSISDN: ${input} (normalized to ${s})`);
  }
  return s;
}

export type StkPushResult = {
  checkoutRequestId: string;
  customerMessage: string;
  responseCode: string;
  responseDescription: string;
  merchantRequestId: string;
};

/**
 * Initiate an STK Push. Throws on Daraja-side errors (network, auth, malformed
 * request). Returns the CheckoutRequestID — this is the idempotency key the
 * callback will reference.
 *
 * `amount` is in whole KES (Daraja rejects decimals).
 * `accountReference` is shown to the customer on the STK prompt — typically
 * the order ID or "MAJID-ORDER-XXX".
 * `description` is the "TransactionDesc" field on Daraja's side.
 */
export async function initiateStkPush(args: {
  phone: string;
  amount: number;
  accountReference: string;
  description: string;
}): Promise<StkPushResult> {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!shortcode || !passkey || !callbackUrl) {
    throw new Error(
      "MPESA_SHORTCODE / MPESA_PASSKEY / MPESA_CALLBACK_URL must be set",
    );
  }

  const accessToken = await getMpesaAccessToken();
  const timestamp = nowTimestamp();
  const password = generatePassword(shortcode, passkey, timestamp);
  const phone = normalizeMsisdn(args.phone);

  const url = `${BASE_URL}/mpesa/stkpush/v1/processrequest`;
  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(args.amount),
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: args.accountReference.slice(0, 12), // Daraja max 12 chars
    TransactionDesc: args.description.slice(0, 13), // Daraja max 13 chars
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    ...(process.env.MPESA_ENV !== "production"
      ? { agent: new https.Agent({ rejectUnauthorized: false }) }
      : {}),
  });

  const data = (await res.json()) as any;

  // Daraja returns 200 with ResponseCode "0" on success. Anything else is an
  // error — surface the description so the caller can show it to the customer.
  if (!res.ok || data?.ResponseCode !== "0") {
    throw new Error(
      `Daraja STK Push failed: ${data?.errorMessage ?? data?.ResponseDescription ?? `HTTP ${res.status}`}`,
    );
  }

  return {
    checkoutRequestId: data.CheckoutRequestID,
    customerMessage: data.CustomerMessage ?? "Enter your M-Pesa PIN on your phone to complete the payment.",
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
    merchantRequestId: data.MerchantRequestID,
  };
}

/**
 * Type for the callback body Daraja POSTs to /api/mpesa/callback.
 * Only the fields we actually use are typed — Daraja sends many more.
 */
export type MpesaCallbackBody = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: Array<
          | { Name: "Amount"; Value: number }
          | { Name: "MpesaReceiptNumber"; Value: string }
          | { Name: "Balance"; Value?: string }
          | { Name: "TransactionDate"; Value: number }
          | { Name: "PhoneNumber"; Value: number }
          | { Name: string; Value?: unknown }
        >;
      };
    };
  };
};

export type MpesaCallbackResult = {
  checkoutRequestId: string;
  success: boolean;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  mpesaReceiptNumber?: string;
  transactionDate?: Date;
  phoneNumber?: string;
};

/**
 * Parse a Daraja callback body into a flat result. Returns null if the body
 * is malformed (the caller should still respond 200 to Daraja to stop retries
 * on malformed bodies — they won't fix themselves on retry).
 */
export function parseMpesaCallback(body: MpesaCallbackBody): MpesaCallbackResult | null {
  const cb = body?.Body?.stkCallback;
  if (!cb || !cb.CheckoutRequestID) return null;

  const result: MpesaCallbackResult = {
    checkoutRequestId: cb.CheckoutRequestID,
    success: cb.ResultCode === 0,
    resultCode: cb.ResultCode ?? -1,
    resultDesc: cb.ResultDesc ?? "",
  };

  const meta = cb.CallbackMetadata?.Item ?? [];
  for (const item of meta) {
    if (item.Name === "Amount" && typeof item.Value === "number") {
      result.amount = item.Value;
    } else if (item.Name === "MpesaReceiptNumber" && typeof item.Value === "string") {
      result.mpesaReceiptNumber = item.Value;
    } else if (item.Name === "TransactionDate" && typeof item.Value === "number") {
      // Daraja sends YYYYMMDDHHmmss as a number.
      const s = String(item.Value);
      result.transactionDate = new Date(
        `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` +
          `T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}+03:00`,
      );
    } else if (item.Name === "PhoneNumber" && typeof item.Value === "number") {
      result.phoneNumber = String(item.Value);
    }
  }

  return result;
}

/**
 * Convenience: are M-Pesa credentials configured? Used by the checkout UI to
 * decide whether to show M-Pesa as an option or fall back to cash-only.
 */
export function isMpesaConfigured(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CALLBACK_URL,
  );
}
