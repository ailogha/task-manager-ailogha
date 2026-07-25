import { NextResponse } from "next/server";
import { getDbClient, initDatabase } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initDatabase();
    const db = getDbClient();
    const email = "admin@ailogha.com";
    const password = "Zz@0634408525";
    const hash = await bcrypt.hash(password, 12);

    const result = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email]
    });

    if (result.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO users (name, email, password_hash, role, status, job_title, permissions, avatar_color)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          "المدير العام",
          email,
          hash,
          "admin",
          "active",
          "مدير النظام",
          JSON.stringify(["*"]),
          "#10b981"
        ]
      });
      return NextResponse.json({ success: true, message: "تم إنشاء حساب المدير بنجاح" });
    } else {
      await db.execute({
        sql: `UPDATE users SET password_hash = ?, role = 'admin', status = 'active' WHERE email = ?`,
        args: [hash, email]
      });
      return NextResponse.json({ success: true, message: "تم تحديث حساب المدير بنجاح" });
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
