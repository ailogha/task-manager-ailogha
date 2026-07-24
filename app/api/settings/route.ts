import { NextRequest, NextResponse } from "next/server";
import {
  getDbClient,
  initDatabase,
  getSettings,
  updateSetting,
  DEFAULT_SETTINGS,
} from "@/lib/db";
import { verifySession, hasPermission } from "@/lib/auth";

/**
 * GET /api/settings
 * Public endpoint: returns platform settings (name, description, logo, etc.)
 * No sensitive data is exposed.
 */
export async function GET() {
  try {
    await initDatabase();
    const settings = await getSettings();

    // Public-safe settings (no passwords or secrets)
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("Settings GET Error:", error);
    return NextResponse.json(
      { success: false, error: "فشل تحميل الإعدادات" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/settings
 * Admin-only: update platform settings
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "غير مصرح. يرجى تسجيل الدخول." },
        { status: 401 },
      );
    }

    // Only admins can change settings
    if (session.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "فقط المدير العام يمكنه تعديل إعدادات المنصة.",
        },
        { status: 403 },
      );
    }

    await initDatabase();
    const body = await req.json();

    // Validate and update each known setting key
    const validKeys = Object.keys(DEFAULT_SETTINGS);
    const updated: string[] = [];

    for (const key of validKeys) {
      if (key in body && body[key] !== undefined) {
        const value = String(body[key]);
        // Limit value length to prevent abuse
        if (value.length > 10000) {
          return NextResponse.json(
            { success: false, error: `قيمة الحقل ${key} كبيرة جداً` },
            { status: 400 },
          );
        }
        await updateSetting(key, value);
        updated.push(key);
      }
    }

    // Log the change
    const db = getDbClient();
    await db.execute({
      sql: "INSERT INTO activity_logs (action, details) VALUES (?, ?)",
      args: [
        "تحديث إعدادات المنصة",
        `تم تحديث الإعدادات التالية: ${updated.join("، ")} بواسطة ${session.name}.`,
      ],
    });

    const settings = await getSettings();
    return NextResponse.json({
      success: true,
      message: "تم حفظ الإعدادات بنجاح",
      settings,
    });
  } catch (error: any) {
    console.error("Settings PUT Error:", error);
    return NextResponse.json(
      { success: false, error: "فشل حفظ الإعدادات" },
      { status: 500 },
    );
  }
}
