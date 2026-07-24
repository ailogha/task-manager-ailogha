import { NextRequest, NextResponse } from "next/server";
import { initDatabase, updateSetting } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import fs from "fs";
import path from "path";

/**
 * POST /api/settings/upload
 * Admin-only: upload platform logo or icon as base64 in settings
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
          error: "فقط المدير العام يمكنه رفع الشعارات.",
        },
        { status: 403 },
      );
    }

    await initDatabase();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "logo"; // logo or icon

    if (!file) {
      return NextResponse.json(
        { success: false, error: "لم يتم اختيار ملف" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "نوع الملف غير مدعوم. يُسمح بـ PNG, JPEG, SVG, WebP",
        },
        { status: 400 },
      );
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "حجم الملف يجب ألا يتجاوز 2 ميجابايت" },
        { status: 400 },
      );
    }

    // Convert to base64 data URL for storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Save to settings table
    const settingKey = type === "icon" ? "platform_icon" : "platform_logo";
    await updateSetting(settingKey, dataUrl);

    return NextResponse.json({
      success: true,
      message: "تم رفع الملف بنجاح",
      url: dataUrl,
    });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json(
      { success: false, error: "فشل رفع الملف" },
      { status: 500 },
    );
  }
}
