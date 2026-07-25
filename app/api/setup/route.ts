import { NextRequest, NextResponse } from "next/server";
import { initDatabase, getDbClient, hashPassword } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const db = getDbClient();

    // Block if users already exist
    const check = await db.execute("SELECT COUNT(*) as count FROM users");
    if (Number(check.rows[0]?.count || 0) > 0) {
      return NextResponse.json(
        { success: false, error: "تم إعداد النظام مسبقاً" },
        { status: 403 },
      );
    }

    const { name, email, password } = await req.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: "جميع الحقول مطلوبة" },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" },
        { status: 400 },
      );
    }

    const hash = await hashPassword(password);
    await db.execute({
      sql: `INSERT INTO users (name, email, password_hash, role, status, job_title, permissions, avatar_color, last_login)
            VALUES (?, ?, ?, 'admin', 'active', 'مدير النظام', ?, '#0f172a', CURRENT_TIMESTAMP)`,
      args: [
        name.trim(),
        email.toLowerCase().trim(),
        hash,
        JSON.stringify(["manage_users","manage_projects","manage_tasks","system_control","view_reports","export_db","manage_settings"]),
      ],
    });

    const userRes = await db.execute({ sql: "SELECT * FROM users WHERE email = ?", args: [email.toLowerCase().trim()] });
    const dbUser = userRes.rows[0] as any;
    const token = await createSession(Number(dbUser.id));

    return NextResponse.json({
      success: true,
      user: {
        id: Number(dbUser.id),
        name: String(dbUser.name),
        email: String(dbUser.email),
        role: "admin",
        token,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "فشل إعداد النظام" },
      { status: 500 },
    );
  }
}
