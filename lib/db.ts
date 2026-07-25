import { createClient, Client } from "@libsql/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Database client — supports both local file and remote Turso/libSQL.
//
// URL resolution priority:
//   1. DATABASE_URL / TURSO_DATABASE_URL that starts with "libsql://" → remote (Turso)
//   2. DATABASE_URL that starts with "file:" → explicit local file path
//   3. Otherwise → default local file:
//        - Production (NEXT_PUBLIC_NODE_ENV=production OR /app/data exists):
//            /app/data/sqlite.db   ← MUST match the Coolify persistent volume mount
//        - Development: ./sqlite.db  (repo root)
//
// In production, the Coolify persistent volume mounts host path → /app/data.
// Writing the SQLite file anywhere else (e.g. /app/sqlite.db) is EPHEMERAL
// and is lost on every redeploy. So we always anchor to /app/data in prod.
let client: Client | null = null;

function resolveLocalDbPath(): string {
  // Allow explicit override (e.g. file:/app/data/sqlite.db)
  const explicit = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
  if (explicit && explicit.startsWith("file:")) {
    return explicit;
  }

  // Persistent volume directory used by Coolify/Docker deployments.
  // /app is Nixpacks' default app dir; /app/data is our mounted volume.
  const isProd =
    process.env.NODE_ENV === "production" || fs.existsSync("/app/data");

  if (isProd) {
    const dir = "/app/data";
    // Defensive: ensure the directory exists before libsql opens the file.
    // The volume mount should already provide it, but mkdir -p is cheap.
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore — will surface as a clearer open() error from libsql
    }
    return `file:${path.join(dir, "sqlite.db")}`;
  }

  // Local development fallback (relative to repo root / CWD).
  return "file:sqlite.db";
}

export function getDbClient(): Client {
  if (!client) {
    const dbUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
    const authToken =
      process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

    if (dbUrl && dbUrl.startsWith("libsql://")) {
      // Remote Turso/libSQL database (managed production option)
      client = createClient({
        url: dbUrl,
        authToken: authToken || undefined,
      });
    } else {
      // Local SQLite file (dev or self-hosted with persistent volume)
      client = createClient({
        url: resolveLocalDbPath(),
      });
    }
  }
  return client;
}

// ============================================================
// SECURITY: Real password hashing with bcrypt
// ============================================================
const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  // Support legacy hashes (migrate on the fly)
  if (hash.startsWith("pbkdf2:")) {
    // Legacy fake hash: pbkdf2:PASSWORD_hash_sec
    const legacyPlain = hash.replace("pbkdf2:", "").replace("_hash_sec", "");
    const match = plain === legacyPlain;
    if (match) {
      // Caller should re-hash after successful legacy match
    }
    return match;
  }
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// ============================================================
// Types
// ============================================================
export interface Project {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  category: string;
  status: "active" | "completed" | "archived";
  created_at: string;
  task_count?: number;
  completed_task_count?: number;
  progress?: number;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  estimated_hours: number;
  actual_hours: number;
  tags: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  project_name?: string;
  project_color?: string;
  subtasks?: Subtask[];
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  completed: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  password?: string; // Optional field for updates
  role: "admin" | "manager" | "member" | "viewer";
  status: "active" | "inactive" | "suspended";
  job_title: string;
  permissions: string;
  avatar_color: string;
  created_at: string;
  last_login?: string | null;
}

export interface ActivityLog {
  id: number;
  action: string;
  details: string;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface PlatformSettings {
  platform_name: string;
  platform_description: string;
  platform_logo: string;
  platform_icon: string;
  primary_color: string;
  company_name: string;
  contact_email: string;
  default_language: string;
  default_role: string;
}

// ============================================================
// AI Providers & Models
// ============================================================
export interface AiProvider {
  id: number;
  name: string;
  base_url: string;
  api_key: string;
  is_active: number; // 0 or 1
  created_at: string;
  models?: AiModel[];
}

export interface AiModel {
  id: number;
  provider_id: number;
  model_id: string; // e.g. "gpt-4o", "claude-3-sonnet"
  display_name: string;
  is_available: number;
  fetched_at: string;
}

export interface ModelAssignment {
  feature_key: string; // e.g. "task_generator", "project_analyzer"
  provider_id: number;
  model_id: string;
}

// All AI features that can be assigned a model
export const AI_FEATURES = [
  {
    key: "task_generator",
    label: "توليد المهام والخطط",
    description: "إنشاء قوائم مهام تلقائية من وصف المشروع",
  },
  {
    key: "project_analyzer",
    label: "تحليل المشاريع والمخاطر",
    description: "تحليل أداء المشروع وتقديم توصيات ذكية",
  },
  {
    key: "content_writer",
    label: "كتابة المحتوى والأوصاف",
    description: "توليد أوصاف المهام والمشاريع والمحتوى",
  },
] as const;


// ============================================================
// Default Settings
// ============================================================
export const DEFAULT_SETTINGS: PlatformSettings = {
  platform_name: "نظام إدارة المهام والمشاريع",
  platform_description:
    "منصة احترافية متكاملة لإدارة المشاريع والمهام والفرق بدعم كامل لقاعدة بيانات SQLite المحلية.",
  platform_logo: "",
  platform_icon: "",
  primary_color: "#0f172a",
  company_name: "شركتي",
  contact_email: "admin@company.com",
  default_language: "ar",
  default_role: "member",
};

// ============================================================
// Database Initialization
// ============================================================
export async function initDatabase() {
  const db = getDbClient();

  // Create Projects Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3b82f6',
      icon TEXT DEFAULT 'folder',
      category TEXT DEFAULT 'عام',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Tasks Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      estimated_hours REAL DEFAULT 0,
      actual_hours REAL DEFAULT 0,
      tags TEXT,
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Create Subtasks Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  // Create Activity Logs Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Users Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT DEFAULT 'active',
      job_title TEXT,
      permissions TEXT,
      avatar_color TEXT DEFAULT '#3b82f6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );
  `);

  // Create Settings Table (for platform customization)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create AI Providers Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create AI Models Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL,
      model_id TEXT NOT NULL,
      display_name TEXT,
      is_available INTEGER DEFAULT 1,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE,
      UNIQUE(provider_id, model_id)
    );
  `);

  // Create Model Assignments Table (which model for which feature)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS model_assignments (
      feature_key TEXT PRIMARY KEY,
      provider_id INTEGER,
      model_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE SET NULL
    );
  `);

  // Seed default settings if empty
  const settingsCheck = await db.execute(
    "SELECT COUNT(*) as count FROM settings",
  );
  const settingsCount = Number(settingsCheck.rows[0]?.count || 0);

  if (settingsCount === 0) {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await db.execute({
        sql: `INSERT INTO settings (key, value) VALUES (?, ?)`,
        args: [key, String(value)],
      });
    }
  }

  // Seed first admin from environment variables when the DB has no users.
  // This runs on every fresh deploy (e.g. empty Coolify persistent volume),
  // so the admin account is always recreated automatically without /setup.
  // /setup page remains available as a fallback if env vars are absent.
  const userCheck = await db.execute("SELECT COUNT(*) as count FROM users");
  const userCount = Number(userCheck.rows[0]?.count || 0);

  if (userCount === 0) {
    const adminEmail =
      process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.trim()
        ? process.env.ADMIN_EMAIL.trim()
        : null;
    const adminPassword =
      process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim()
        ? process.env.ADMIN_PASSWORD.trim()
        : null;

    if (adminEmail && adminPassword) {
      const adminHash = await hashPassword(adminPassword);
      await db.execute({
        sql: `INSERT INTO users (name, email, password_hash, role, status, job_title, permissions, avatar_color, last_login)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [
          process.env.ADMIN_NAME && process.env.ADMIN_NAME.trim()
            ? process.env.ADMIN_NAME.trim()
            : "المدير العام",
          adminEmail,
          adminHash,
          "admin",
          "active",
          "مدير النظام",
          JSON.stringify([
            "manage_users",
            "manage_projects",
            "manage_tasks",
            "system_control",
            "view_reports",
            "export_db",
            "manage_settings",
          ]),
          "#0f172a",
        ],
      });
    }
    // If env vars are absent, /setup page handles first admin creation.
  }

  // Migrate legacy hashes to bcrypt
  const allUsers = await db.execute("SELECT id, password_hash FROM users");
  for (const row of allUsers.rows) {
    const hash = String(row.password_hash);
    if (hash.startsWith("pbkdf2:")) {
      const plain = hash.replace("pbkdf2:", "").replace("_hash_sec", "");
      const newHash = await hashPassword(plain);
      await db.execute({
        sql: "UPDATE users SET password_hash = ? WHERE id = ?",
        args: [newHash, Number(row.id)],
      });
    }
  }

  // Seed projects if empty
  const projectCheck = await db.execute(
    "SELECT COUNT(*) as count FROM projects",
  );
  const count = Number(projectCheck.rows[0]?.count || 0);

  if (count === 0) {
    const p1 = await db.execute({
      sql: `INSERT INTO projects (name, description, color, icon, category, status)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        "تطوير تطبيق الهاتف المحمول",
        "تطوير وتصميم واجهات وتطبيق الهاتف الذكي لمنصة الخدمة الذاتية.",
        "#3b82f6",
        "smartphone",
        "برمجيات",
        "active",
      ],
    });
    const p1Id = Number(p1.lastInsertRowid);

    const p2 = await db.execute({
      sql: `INSERT INTO projects (name, description, color, icon, category, status)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        "حملة التسويق الرقمي Q3",
        "خطة إعلانية عبر وسائل التواصل الاجتماعي وتحسين محركات البحث SEO.",
        "#10b981",
        "mega-phone",
        "تسويق",
        "active",
      ],
    });
    const p2Id = Number(p2.lastInsertRowid);

    const p3 = await db.execute({
      sql: `INSERT INTO projects (name, description, color, icon, category, status)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        "إعادة تصميم البوابة الإلكترونية",
        "تحديث تصميم وتجربة المستخدم وتطوير الواجهات الخلفية.",
        "#8b5cf6",
        "layout",
        "تصميم",
        "active",
      ],
    });
    const p3Id = Number(p3.lastInsertRowid);

    // Seed tasks
    const t1 = await db.execute({
      sql: `INSERT INTO tasks (project_id, title, description, status, priority, due_date, estimated_hours, actual_hours, tags, assigned_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p1Id,
        "تصميم واجهات المستخدم UI/UX",
        "إعداد المخططات الهيكلية والأنماط البصرية لشاشات التطبيق.",
        "completed",
        "high",
        "2026-07-28",
        16,
        14,
        "تصميم,واجهات",
        "أحمد محمود",
      ],
    });
    const t1Id = Number(t1.lastInsertRowid);

    await db.execute({
      sql: `INSERT INTO subtasks (task_id, title, completed) VALUES (?, ?, ?), (?, ?, ?)`,
      args: [t1Id, "شاشة التسجيل والدخول", 1, t1Id, "شاشة الملف الشخصي", 1],
    });

    const t2 = await db.execute({
      sql: `INSERT INTO tasks (project_id, title, description, status, priority, due_date, estimated_hours, actual_hours, tags, assigned_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p1Id,
        "ربط واجهات API والمصادقة",
        "إنشاء مسارات البرمجة المتقدمة والتكامل مع SQLite وحماية الجلسات.",
        "in_progress",
        "urgent",
        "2026-08-05",
        24,
        10,
        "تطوير,خلفية",
        "سارة خالد",
      ],
    });
    const t2Id = Number(t2.lastInsertRowid);

    await db.execute({
      sql: `INSERT INTO subtasks (task_id, title, completed) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)`,
      args: [
        t2Id,
        "إعداد قاعدة البيانات المحلية",
        1,
        t2Id,
        "إنشاء واجهات الاستعلام",
        1,
        t2Id,
        "اختبار الحماية والتشفير",
        0,
      ],
    });

    await db.execute({
      sql: `INSERT INTO tasks (project_id, title, description, status, priority, due_date, estimated_hours, actual_hours, tags, assigned_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p1Id,
        "إعداد التنبيهات الفورية (Push Notifications)",
        "تفعيل إشعارات التذكير بالمهام والمشاريع المحدثة.",
        "todo",
        "medium",
        "2026-08-12",
        12,
        0,
        "إشعارات",
        "محمد علي",
      ],
    });

    await db.execute({
      sql: `INSERT INTO tasks (project_id, title, description, status, priority, due_date, estimated_hours, actual_hours, tags, assigned_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p2Id,
        "كتابة المحتوى الإعلاني والتصاميم",
        "صياغة 10 منشورات تفاعلية وتصميم صور هادفة.",
        "in_progress",
        "high",
        "2026-07-30",
        10,
        6,
        "محتوى,تصميم",
        "فاطمة الزهراء",
      ],
    });

    await db.execute({
      sql: `INSERT INTO tasks (project_id, title, description, status, priority, due_date, estimated_hours, actual_hours, tags, assigned_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p2Id,
        "إطلاق الحملة المموّلة على منصات التواصل",
        "استهداف شريحة المهتمين بالتقنية والإنتاجية.",
        "todo",
        "medium",
        "2026-08-10",
        8,
        0,
        "إعلانات",
        "عمر الشريف",
      ],
    });

    await db.execute({
      sql: `INSERT INTO tasks (project_id, title, description, status, priority, due_date, estimated_hours, actual_hours, tags, assigned_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p3Id,
        "تحسين سرعة وأداء الموقع (SEO)",
        "تحسين مقاييس Core Web Vitals وضغط الصور وزيادة استجابة الموقع.",
        "review",
        "high",
        "2026-08-01",
        14,
        12,
        "أداء,SEO",
        "يوسف حسن",
      ],
    });

    await db.execute({
      sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
      args: [
        "تهيئة قاعدة البيانات",
        "تم إنشاء البيانات الافتراضية للجداول والمشاريع في SQLite بنجاح.",
      ],
    });
  }
}

// ============================================================
// Settings Helpers
// ============================================================
export async function getSettings(): Promise<PlatformSettings> {
  const db = getDbClient();
  try {
    const result = await db.execute("SELECT key, value FROM settings");
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of result.rows) {
      const key = String(row.key);
      if (key in settings) {
        (settings as any)[key] = String(row.value);
      }
    }
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const db = getDbClient();
  await db.execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    args: [key, value],
  });
}
