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
  deletedIds: {},
  itemEdits: {},
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

function normalizeDeletedIds(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  Object.keys(input).forEach((key) => {
    const id = String(key || "").trim();
    if (!id) return;
    if (input[key]) out[id] = true;
  });
  return out;
}

function normalizeItemEdits(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  Object.keys(input).forEach((key) => {
    const id = String(key || "").trim();
    if (!id) return;
    const val = input[key];
    if (!val || typeof val !== "object") return;
    const next = {};
    if (typeof val.name === "string") next.name = val.name.trim();
    if (val.price !== undefined && val.price !== null && val.price !== "") {
      const p = Number(val.price);
      if (Number.isFinite(p) && p >= 0) next.price = p;
    }
    if (typeof val.desc === "string") next.desc = val.desc.trim();
    if (typeof val.image === "string") next.image = val.image.trim();
    out[id] = next;
  });
  return out;
}

function deleteInventoryItemById(db, id) {
  const next = db && typeof db === "object" ? db : { ...defaultInventoryDb };
  next.customSweets = Array.isArray(next.customSweets) ? next.customSweets : [];
  next.stockState = normalizeStockState(next.stockState);
  next.deletedIds = normalizeDeletedIds(next.deletedIds);
  next.customSweets = next.customSweets.filter((it) => it && it.id !== id);
  if (next.stockState[id]) delete next.stockState[id];
  next.deletedIds[id] = true;
  if (next.itemEdits && next.itemEdits[id]) delete next.itemEdits[id];
  return next;
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
      deletedIds: normalizeDeletedIds(parsed?.deletedIds),
      itemEdits: normalizeItemEdits(parsed?.itemEdits),
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
    deletedIds: normalizeDeletedIds(nextDb?.deletedIds),
    itemEdits: normalizeItemEdits(nextDb?.itemEdits),
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
    if (db.deletedIds && db.deletedIds[sweet.id]) {
      delete db.deletedIds[sweet.id];
    }
    const exists = db.customSweets.some((it) => it.id === sweet.id);
    if (exists) {
      return res.status(409).json({ ok: false, error: "sweet_id_exists" });
    }
    db.customSweets.push(sweet);
    const saved = await writeInventoryDb(db);
    return res.json({
      ok: true,
      customSweets: saved.customSweets,
      deletedIds: saved.deletedIds,
      itemEdits: saved.itemEdits,
    });
  } catch (err) {
    console.error("Add sweet failed:", err);
    return res.status(500).json({ ok: false, error: "inventory_add_sweet_failed" });
  }
});

app.delete("/api/inventory/sweets/:id", async (req, res) => {
  try {
    const id = String(req.params?.id || "").trim();
    if (!id) {
      return res.status(400).json({ ok: false, error: "invalid_sweet_id" });
    }
    const db = await readInventoryDb();
    const before = db.customSweets.length;
    deleteInventoryItemById(db, id);
    if (db.customSweets.length === before) {
      return res.status(404).json({ ok: false, error: "sweet_not_found" });
    }
    const saved = await writeInventoryDb(db);
    return res.json({
      ok: true,
      customSweets: saved.customSweets,
      stockState: saved.stockState,
      deletedIds: saved.deletedIds,
      itemEdits: saved.itemEdits,
    });
  } catch (err) {
    console.error("Delete sweet failed:", err);
    return res.status(500).json({ ok: false, error: "inventory_delete_sweet_failed" });
  }
});

app.delete("/api/inventory/items/:id", async (req, res) => {
  try {
    const id = String(req.params?.id || "").trim();
    if (!id) {
      return res.status(400).json({ ok: false, error: "invalid_item_id" });
    }
    const db = await readInventoryDb();
    deleteInventoryItemById(db, id);
    const saved = await writeInventoryDb(db);
    return res.json({
      ok: true,
      customSweets: saved.customSweets,
      stockState: saved.stockState,
      deletedIds: saved.deletedIds,
      itemEdits: saved.itemEdits,
    });
  } catch (err) {
    console.error("Delete inventory item failed:", err);
    return res.status(500).json({ ok: false, error: "inventory_delete_item_failed" });
  }
});

app.post("/api/inventory/items/:id", async (req, res) => {
  try {
    const id = String(req.params?.id || "").trim();
    if (!id) {
      return res.status(400).json({ ok: false, error: "invalid_item_id" });
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const db = await readInventoryDb();
    db.itemEdits = normalizeItemEdits(db.itemEdits);
    db.itemEdits[id] = {
      name: typeof body.name === "string" ? body.name.trim() : "",
      price:
        body.price !== undefined && body.price !== null && body.price !== ""
          ? Number(body.price)
          : undefined,
      desc: typeof body.desc === "string" ? body.desc.trim() : "",
      image: typeof body.image === "string" ? body.image.trim() : "",
    };
    if (!db.itemEdits[id].name) delete db.itemEdits[id].name;
    if (!Number.isFinite(db.itemEdits[id].price) || db.itemEdits[id].price < 0) {
      delete db.itemEdits[id].price;
    }
    if (!db.itemEdits[id].desc) delete db.itemEdits[id].desc;
    if (!db.itemEdits[id].image) delete db.itemEdits[id].image;
    const saved = await writeInventoryDb(db);
    return res.json({ ok: true, itemEdits: saved.itemEdits });
  } catch (err) {
    console.error("Update inventory item failed:", err);
    return res.status(500).json({ ok: false, error: "inventory_update_item_failed" });
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
