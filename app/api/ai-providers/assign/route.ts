import { NextRequest, NextResponse } from "next/server";
import { getDbClient, initDatabase } from "@/lib/db";
import { verifySession } from "@/lib/auth";

/**
 * POST /api/ai-providers/assign
 * Assign a specific model to a specific feature.
 * Body: { feature_key, provider_id, model_id }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "غير مصرح. يرجى تسجيل الدخول." },
        { status: 401 },
      );
    }

    if (session.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "فقط المدير العام يمكنه إسناد النماذج للميزات.",
        },
        { status: 403 },
      );
    }

    await initDatabase();
    const db = getDbClient();
    const body = await req.json();
    const { feature_key, provider_id, model_id } = body;

    if (!feature_key) {
      return NextResponse.json(
        { success: false, error: "مفتاح الميزة مطلوب" },
        { status: 400 },
      );
    }

    await db.execute({
      sql: `INSERT INTO model_assignments (feature_key, provider_id, model_id, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(feature_key) DO UPDATE SET
              provider_id = excluded.provider_id,
              model_id = excluded.model_id,
              updated_at = CURRENT_TIMESTAMP`,
      args: [feature_key, provider_id || null, model_id || null],
    });

    // Log
    await db.execute({
      sql: "INSERT INTO activity_logs (action, details) VALUES (?, ?)",
      args: [
        "إسناد نموذج ذكاء اصطناعي",
        `تم إسناد النموذج "${model_id}" للميزة "${feature_key}".`,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "تم حفظ إسناد النموذج بنجاح",
    });
  } catch (error: any) {
    console.error("Assignment POST Error:", error);
    return NextResponse.json(
      { success: false, error: "فشل حفظ الإسناد" },
      { status: 500 },
    );
  }
}
