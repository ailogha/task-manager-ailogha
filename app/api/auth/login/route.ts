import { NextRequest, NextResponse } from "next/server";
import { getDbClient, initDatabase, verifyPassword, hashPassword } from "@/lib/db";
import {
  createSession,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from "@/lib/auth";

/**
 * POST /api/auth/login
 * Authenticates users using email & password verified with bcrypt against SQLite.
 * Protected with rate limiting against brute-force attacks.
 */
export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const db = getDbClient();
    const body = await req.json();

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال البريد الإلكتروني وكلمة المرور" },
        { status: 400 },
      );
    }

    // Get client IP for rate limiting
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = `${clientIp}:${email}`;

    // Check rate limit
    const rateCheck = checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      const minutesLeft = Math.ceil(
        ((rateCheck.lockedUntil || 0) - Date.now()) / 60000,
      );
      return NextResponse.json(
        {
          success: false,
          error: `تم قفل الحساب مؤقتاً بسبب محاولات كثيرة فاشلة. حاول مرة أخرى بعد ${minutesLeft} دقيقة.`,
        },
        { status: 429 },
      );
    }

    // Retrieve user from SQLite
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email.toLowerCase().trim()],
    });

    if (result.rows.length === 0) {
      const fail = recordFailedAttempt(rateLimitKey);
      await db.execute({
        sql: "INSERT INTO activity_logs (action, details) VALUES (?, ?)",
        args: [
          "محاولة دخول فاشلة",
          `بريد إلكتروني غير مسجل: ${email} (المحاولات المتبقية: ${fail.remaining})`,
        ],
      });

      return NextResponse.json(
        {
          success: false,
          error: `البريد الإلكتروني غير مسجل. محاولات متبقية: ${fail.remaining}`,
        },
        { status: 401 },
      );
    }

    const dbUser = result.rows[0];

    // Verify password with bcrypt
    const passwordValid = await verifyPassword(
      password,
      String(dbUser.password_hash),
    );

    if (!passwordValid) {
      const fail = recordFailedAttempt(rateLimitKey);
      await db.execute({
        sql: "INSERT INTO activity_logs (action, details) VALUES (?, ?)",
        args: [
          "محاولة دخول فاشلة",
          `كلمة مرور خاطئة للحساب: ${email} (المحاولات المتبقية: ${fail.remaining})`,
        ],
      });

      const errorMsg = fail.locked
        ? "تم قفل الحساب لمدة 30 دقيقة بسبب تجاوز عدد المحاولات المسموحة."
        : `كلمة المرور المدخلة غير صحيحة. محاولات متبقية: ${fail.remaining}`;

      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 401 },
      );
    }

    // Check account status
    if (String(dbUser.status) !== "active") {
      return NextResponse.json(
        { success: false, error: "حسابك معطل حالياً من قبل الإدارة" },
        { status: 403 },
      );
    }

    // Reset rate limit on successful login
    resetRateLimit(rateLimitKey);

    // Update last login timestamp
    await db.execute({
      sql: "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      args: [Number(dbUser.id)],
    });

    await db.execute({
      sql: "INSERT INTO activity_logs (action, details) VALUES (?, ?)",
      args: [
        "تسجيل دخول ناجح",
        `تم تسجيل دخول المستخدم: ${dbUser.name} (${email}) بسلامة.`,
      ],
    });

    // Migrate legacy hash if needed
    if (String(dbUser.password_hash).startsWith("pbkdf2:")) {
      const newHash = await hashPassword(password);
      await db.execute({
        sql: "UPDATE users SET password_hash = ? WHERE id = ?",
        args: [newHash, Number(dbUser.id)],
      });
    }

    // Generate secure session token
    const token = await createSession(Number(dbUser.id));

    const user = {
      id: Number(dbUser.id),
      name: String(dbUser.name),
      email: String(dbUser.email),
      role: String(dbUser.role),
      job_title: String(dbUser.job_title || ""),
      permissions: JSON.parse(String(dbUser.permissions || "[]")),
      avatar_color: String(dbUser.avatar_color || "#3b82f6"),
      last_login: new Date().toISOString(),
      token,
    };

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "حدث خطأ غير متوقع أثناء تسجيل الدخول",
      },
      { status: 500 },
    );
  }
}
