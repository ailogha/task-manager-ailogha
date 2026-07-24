import { NextRequest } from "next/server";
import { getDbClient, User } from "./db";

export interface UserSession {
  id: number;
  userId: number;
  token: string;
  expiresAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: User["role"];
    permissions: string[];
    avatar_color: string;
    status: User["status"];
  };
}

// ============================================================
// SECURITY: In-memory Rate Limiting (brute-force protection)
// ============================================================
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lockedUntil: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCK_MS = 30 * 60 * 1000; // 30 minutes lockout

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  lockedUntil?: number;
} {
  const now = Date.now();
  let entry = rateLimitMap.get(identifier);

  if (!entry) {
    entry = { count: 0, firstAttempt: now, lockedUntil: 0 };
    rateLimitMap.set(identifier, entry);
  }

  if (entry.lockedUntil > now) {
    return { allowed: false, remaining: 0, lockedUntil: entry.lockedUntil };
  }

  if (now - entry.firstAttempt > WINDOW_MS) {
    entry.count = 0;
    entry.firstAttempt = now;
    entry.lockedUntil = 0;
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

export function recordFailedAttempt(identifier: string): {
  locked: boolean;
  remaining: number;
} {
  const now = Date.now();
  let entry = rateLimitMap.get(identifier);

  if (!entry) {
    entry = { count: 0, firstAttempt: now, lockedUntil: 0 };
    rateLimitMap.set(identifier, entry);
  }

  entry.count++;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_MS;
    return { locked: true, remaining: 0 };
  }

  return { locked: false, remaining: MAX_ATTEMPTS - entry.count };
}

export function resetRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}

// ============================================================
// SECURITY: Cryptographically secure token generation
// ============================================================
function generateSecureToken(): string {
  const { randomBytes } = require("crypto");
  const bytes = randomBytes(32);
  return bytes.toString("hex");
}

// Initialize sessions table if it doesn't exist
export async function initSessionsTable() {
  const db = getDbClient();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

// Create a new session token
export async function createSession(userId: number): Promise<string> {
  await initSessionsTable();
  const db = getDbClient();

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await db.execute({
    sql: "INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
    args: [userId, token, expiresAt],
  });

  return token;
}

// Verify request authorization header
export async function verifySession(req: NextRequest): Promise<any | null> {
  try {
    await initSessionsTable();
    const db = getDbClient();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7).trim();
    if (!token || token.length < 10) return null;

    const result = await db.execute({
      sql: `
        SELECT us.token, us.expires_at, u.id, u.name, u.email, u.role, u.permissions, u.avatar_color, u.status
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.token = ?
      `,
      args: [token],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    const expiresAt = new Date(String(row.expires_at)).getTime();
    if (Date.now() > expiresAt) {
      await db.execute({
        sql: "DELETE FROM user_sessions WHERE token = ?",
        args: [token],
      });
      return null;
    }

    if (String(row.status) !== "active") {
      return null;
    }

    return {
      id: Number(row.id),
      name: String(row.name),
      email: String(row.email),
      role: String(row.role),
      permissions: JSON.parse(String(row.permissions || "[]")),
      avatar_color: String(row.avatar_color),
      token,
    };
  } catch (err) {
    console.error("Session Verification Error:", err);
    return null;
  }
}

// Helper to check if user has admin/manager privileges
export function isElevatedUser(user: any): boolean {
  return user && (user.role === "admin" || user.role === "manager");
}

// Helper to check if user has specific permission
export function hasPermission(user: any, permission: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return (
    Array.isArray(user.permissions) && user.permissions.includes(permission)
  );
}
