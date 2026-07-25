import { NextRequest, NextResponse } from "next/server";
import { initDatabase, getDbClient } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const db = getDbClient();

    // Check if the database has any users. If it does, we require a session to prevent unauthorized initialization/resets.
    try {
      const userCheck = await db.execute("SELECT COUNT(*) as count FROM users");
      const userCount = Number(userCheck.rows[0]?.count || 0);

      if (userCount > 0) {
        // Only verify session if users already exist
        const session = await verifySession(req);
        if (!session) {
          return NextResponse.json(
            {
              success: false,
              error: "غير مصرح لك بالوصول. يرجى تسجيل الدخول أولاً.",
            },
            { status: 401 },
          );
        }
      }
    } catch (e) {
      // If the query fails, it likely means the 'users' table doesn't exist yet,
      // which means this is a fresh setup. We can proceed with initialization.
    }

    await initDatabase();

    const projectsRes = await db.execute(
      "SELECT COUNT(*) as count FROM projects",
    );
    const tasksRes = await db.execute("SELECT COUNT(*) as count FROM tasks");
    const subtasksRes = await db.execute(
      "SELECT COUNT(*) as count FROM subtasks",
    );

    return NextResponse.json({
      success: true,
      message: "قاعدة البيانات SQLite جاهزة وتعمل بنجاح",
      storage: "sqlite.db (تخزين دائم محلي)",
      counts: {
        projects: Number(projectsRes.rows[0]?.count || 0),
        tasks: Number(tasksRes.rows[0]?.count || 0),
        subtasks: Number(subtasksRes.rows[0]?.count || 0),
      },
    });
  } catch (error: any) {
    console.error("Error initializing SQLite DB:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "فشل الاتصال بقاعدة بيانات SQLite",
      },
      { status: 500 },
    );
  }
}
