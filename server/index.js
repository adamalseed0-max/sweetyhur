import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import twilio from "twilio";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "inventory-db.json");

if (!accountSid || !authToken || !verifyServiceSid) {
  console.error(
    "Missing Twilio env vars. Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID"
  );
}

const client = twilio(accountSid, authToken);

app.use(
  cors({
    origin: true,
    credentials: false,
  })
);
app.use(express.json());

const defaultInventoryDb = {
  customSweets: [],
  stockState: {},
};

function normalizeSweet(item) {
  if (!item || typeof item !== "object") return null;
  const id = String(item.id || "").trim();
  const name = String(item.name || "").trim();
  const price = Number(item.price);
  const desc = String(item.desc || "").trim();
  const image = String(item.image || "").trim();
  if (!id || !name || !Number.isFinite(price) || price <= 0) return null;
  return { id, name, price, desc, image };
}

function normalizeStockState(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  Object.keys(input).forEach((key) => {
    const id = String(key || "").trim();
    if (!id) return;
    if (input[key]) out[id] = true;
  });
  return out;
}

async function readInventoryDb() {
  try {
    const raw = await fs.readFile(dbPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      customSweets: Array.isArray(parsed?.customSweets)
        ? parsed.customSweets.map(normalizeSweet).filter(Boolean)
        : [],
      stockState: normalizeStockState(parsed?.stockState),
    };
  } catch (_err) {
    return { ...defaultInventoryDb };
  }
}

async function writeInventoryDb(nextDb) {
  const safeDb = {
    customSweets: Array.isArray(nextDb?.customSweets)
      ? nextDb.customSweets.map(normalizeSweet).filter(Boolean)
      : [],
    stockState: normalizeStockState(nextDb?.stockState),
  };
  await fs.writeFile(dbPath, JSON.stringify(safeDb, null, 2), "utf8");
  return safeDb;
}

function sanitizePhone(input) {
  const raw = String(input || "").trim();
  if (!raw.startsWith("+")) return "";
  const normalized = raw.replace(/[^\d+]/g, "");
  return /^\+\d{8,15}$/.test(normalized) ? normalized : "";
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/inventory", async (_req, res) => {
  try {
    const db = await readInventoryDb();
    return res.json({ ok: true, ...db });
  } catch (err) {
    console.error("Inventory read failed:", err);
    return res.status(500).json({ ok: false, error: "inventory_read_failed" });
  }
});

app.post("/api/inventory/sweets", async (req, res) => {
  try {
    const sweet = normalizeSweet(req.body);
    if (!sweet) {
      return res.status(400).json({ ok: false, error: "invalid_sweet_payload" });
    }
    const db = await readInventoryDb();
    const exists = db.customSweets.some((it) => it.id === sweet.id);
    if (exists) {
      return res.status(409).json({ ok: false, error: "sweet_id_exists" });
    }
    db.customSweets.push(sweet);
    const saved = await writeInventoryDb(db);
    return res.json({ ok: true, customSweets: saved.customSweets });
  } catch (err) {
    console.error("Add sweet failed:", err);
    return res.status(500).json({ ok: false, error: "inventory_add_sweet_failed" });
  }
});

app.post("/api/inventory/stock", async (req, res) => {
  try {
    const stockState = normalizeStockState(req.body?.stockState);
    const db = await readInventoryDb();
    db.stockState = stockState;
    const saved = await writeInventoryDb(db);
    return res.json({ ok: true, stockState: saved.stockState });
  } catch (err) {
    console.error("Update stock failed:", err);
    return res.status(500).json({ ok: false, error: "inventory_stock_update_failed" });
  }
});

app.post("/api/admin-otp/start", async (req, res) => {
  try {
    if (!accountSid || !authToken || !verifyServiceSid) {
      return res.status(500).json({ ok: false, error: "config_missing" });
    }

    const phone = sanitizePhone(req.body?.phone);
    if (!phone) {
      return res.status(400).json({ ok: false, error: "invalid_phone" });
    }

    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: "sms" });

    return res.json({ ok: true, sid: verification.sid, status: verification.status });
  } catch (err) {
    const code = Number(err?.code || 0);
    if (code === 60203) {
      return res.status(429).json({ ok: false, error: "max_attempts_reached" });
    }
    if (code === 60200 || code === 60202 || code === 60212) {
      return res.status(400).json({ ok: false, error: "invalid_phone" });
    }
    console.error("OTP start failed:", err);
    return res.status(500).json({ ok: false, error: "otp_start_failed" });
  }
});

app.post("/api/admin-otp/check", async (req, res) => {
  try {
    if (!accountSid || !authToken || !verifyServiceSid) {
      return res.status(500).json({ ok: false, error: "config_missing" });
    }

    const phone = sanitizePhone(req.body?.phone);
    const code = String(req.body?.code || "").trim();
    if (!phone || !/^\d{4,10}$/.test(code)) {
      return res.status(400).json({ ok: false, error: "invalid_payload" });
    }

    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code });

    if (check.status === "approved") {
      return res.json({ ok: true, approved: true });
    }
    return res.status(401).json({ ok: false, approved: false, error: "invalid_or_expired_code" });
  } catch (err) {
    const code = Number(err?.code || 0);
    if (code === 60202 || code === 60200 || code === 20404) {
      return res.status(401).json({ ok: false, approved: false, error: "invalid_or_expired_code" });
    }
    if (code === 60203) {
      return res.status(429).json({ ok: false, approved: false, error: "max_attempts_reached" });
    }
    console.error("OTP check failed:", err);
    return res.status(500).json({ ok: false, approved: false, error: "otp_check_failed" });
  }
});

app.listen(port, () => {
  console.log(`OTP server listening on http://localhost:${port}`);
});
