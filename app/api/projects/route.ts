import { NextRequest, NextResponse } from "next/server";
import { initDatabase, getDbClient } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
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

    // Select projects with task counts and completion rate
    const sql = `
      SELECT 
        p.*,
        COUNT(t.id) as task_count,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_task_count
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    const result = await db.execute(sql);
    const projects = result.rows.map((row: any) => {
      const task_count = Number(row.task_count || 0);
      const completed_task_count = Number(row.completed_task_count || 0);
      const progress =
        task_count > 0
          ? Math.round((completed_task_count / task_count) * 100)
          : 0;

      return {
        id: Number(row.id),
        name: row.name,
        description: row.description || "",
        color: row.color || "#3b82f6",
        icon: row.icon || "folder",
        category: row.category || "عام",
        status: row.status || "active",
        created_at: row.created_at,
        task_count,
        completed_task_count,
        progress,
      };
    });

    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل جلب المشاريع" },
      { status: 500 },
    );
  }
}

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

    const { name, description, color, icon, category, status } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "اسم المشروع مطلوب" },
        { status: 400 },
      );
    }

    const res = await db.execute({
      sql: `INSERT INTO projects (name, description, color, icon, category, status)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        name.trim(),
        description || "",
        color || "#3b82f6",
        icon || "folder",
        category || "عام",
        status || "active",
      ],
    });

    const newId = Number(res.lastInsertRowid);

    // Log Activity
    await db.execute({
      sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
      args: [
        "إضافة مشروع",
        `تم إنشاء المشروع الجديد "${name}" بواسطة ${session.name} في SQLite.`,
      ],
    });

    return NextResponse.json({
      success: true,
      project: {
        id: newId,
        name,
        description: description || "",
        color: color || "#3b82f6",
        icon: icon || "folder",
        category: category || "عام",
        status: status || "active",
        task_count: 0,
        completed_task_count: 0,
        progress: 0,
      },
    });
  } catch (error: any) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل إنشاء المشروع" },
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

    const { id, name, description, color, icon, category, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف المشروع مطلوب" },
        { status: 400 },
      );
    }

    await db.execute({
      sql: `UPDATE projects 
            SET name = ?, description = ?, color = ?, icon = ?, category = ?, status = ?
            WHERE id = ?`,
      args: [
        name,
        description || "",
        color || "#3b82f6",
        icon || "folder",
        category || "عام",
        status || "active",
        id,
      ],
    });

    // Log Activity
    await db.execute({
      sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
      args: [
        "تحديث مشروع",
        `تم تعديل بيانات المشروع #${id} "${name}" بواسطة ${session.name} في SQLite.`,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث المشروع بنجاح",
    });
  } catch (error: any) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل تحديث المشروع" },
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
        { success: false, error: "معرف المشروع مطلوب" },
        { status: 400 },
      );
    }

    // Delete subtasks of tasks belonging to this project
    await db.execute({
      sql: `DELETE FROM subtasks WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)`,
      args: [id],
    });

    // Delete tasks belonging to this project
    await db.execute({
      sql: `DELETE FROM tasks WHERE project_id = ?`,
      args: [id],
    });

    // Delete project
    await db.execute({
      sql: `DELETE FROM projects WHERE id = ?`,
      args: [id],
    });

    // Log Activity
    await db.execute({
      sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
      args: [
        "حذف مشروع",
        `تم حذف المشروع #${id} وجميع مهامه المقترنة بواسطة ${session.name} من SQLite.`,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "تم حذف المشروع بنجاح",
    });
  } catch (error: any) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل حذف المشروع" },
      { status: 500 },
    );
  }
}
