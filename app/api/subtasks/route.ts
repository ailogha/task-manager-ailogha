import { NextRequest, NextResponse } from "next/server";
import { initDatabase, getDbClient } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
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

    await initDatabase();
    const db = getDbClient();
    const body = await req.json();

    const { task_id, title } = body;

    if (!task_id || !title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "معرف المهمة وعنوان المهمة الفرعية مطلوبان" },
        { status: 400 },
      );
    }

    const res = await db.execute({
      sql: `INSERT INTO subtasks (task_id, title, completed) VALUES (?, ?, 0)`,
      args: [task_id, title.trim()],
    });

    const newId = Number(res.lastInsertRowid);

    return NextResponse.json({
      success: true,
      subtask: {
        id: newId,
        task_id,
        title: title.trim(),
        completed: 0,
      },
    });
  } catch (error: any) {
    console.error("Error adding subtask:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل إضافة المهمة الفرعية" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
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

    await initDatabase();
    const db = getDbClient();
    const body = await req.json();

    const { id, completed, title } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف المهمة الفرعية مطلوب" },
        { status: 400 },
      );
    }

    if (completed !== undefined) {
      await db.execute({
        sql: `UPDATE subtasks SET completed = ? WHERE id = ?`,
        args: [completed ? 1 : 0, id],
      });
    }

    if (title !== undefined) {
      await db.execute({
        sql: `UPDATE subtasks SET title = ? WHERE id = ?`,
        args: [title.trim(), id],
      });
    }

    return NextResponse.json({ success: true, message: "تم التحديث بنجاح" });
  } catch (error: any) {
    console.error("Error updating subtask:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل التحديث" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
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

    await initDatabase();
    const db = getDbClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف المهمة الفرعية مطلوب" },
        { status: 400 },
      );
    }

    await db.execute({
      sql: `DELETE FROM subtasks WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true, message: "تم الحذف بنجاح" });
  } catch (error: any) {
    console.error("Error deleting subtask:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل الحذف" },
      { status: 500 },
    );
  }
}
