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
    const { searchParams } = new URL(req.url);

    const projectId = searchParams.get("project_id");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");

    let query = `
      SELECT 
        t.*,
        p.name as project_name,
        p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (projectId && projectId !== "all") {
      query += ` AND t.project_id = ?`;
      args.push(Number(projectId));
    }

    if (status && status !== "all") {
      query += ` AND t.status = ?`;
      args.push(status);
    }

    if (priority && priority !== "all") {
      query += ` AND t.priority = ?`;
      args.push(priority);
    }

    if (tag && tag !== "all") {
      query += ` AND t.tags LIKE ?`;
      args.push(`%${tag}%`);
    }

    if (search && search.trim() !== "") {
      query += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
      const term = `%${search.trim()}%`;
      args.push(term, term);
    }

    query += ` ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.created_at DESC`;

    const tasksRes = await db.execute({ sql: query, args });

    // Fetch all subtasks
    const subtasksRes = await db.execute("SELECT * FROM subtasks");
    const subtasksByTaskId: Record<number, any[]> = {};

    subtasksRes.rows.forEach((sRow: any) => {
      const taskId = Number(sRow.task_id);
      if (!subtasksByTaskId[taskId]) {
        subtasksByTaskId[taskId] = [];
      }
      subtasksByTaskId[taskId].push({
        id: Number(sRow.id),
        task_id: taskId,
        title: sRow.title,
        completed: Number(sRow.completed || 0),
      });
    });

    const tasks = tasksRes.rows.map((row: any) => {
      const id = Number(row.id);
      return {
        id,
        project_id: Number(row.project_id),
        title: row.title,
        description: row.description || "",
        status: row.status || "todo",
        priority: row.priority || "medium",
        due_date: row.due_date || null,
        estimated_hours: Number(row.estimated_hours || 0),
        actual_hours: Number(row.actual_hours || 0),
        tags: row.tags || "",
        assigned_to: row.assigned_to || "",
        created_at: row.created_at,
        updated_at: row.updated_at,
        project_name: row.project_name || "بدون مشروع",
        project_color: row.project_color || "#3b82f6",
        subtasks: subtasksByTaskId[id] || [],
      };
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل جلب المهام" },
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

    const {
      project_id,
      title,
      description,
      status,
      priority,
      due_date,
      estimated_hours,
      actual_hours,
      tags,
      assigned_to,
      subtasks,
    } = body;

    if (!title || title.trim() === "") {
      return NextResponse.json(
        { success: false, error: "عنوان المهمة مطلوب" },
        { status: 400 },
      );
    }

    if (!project_id) {
      return NextResponse.json(
        { success: false, error: "المشروع مطلوب" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    const res = await db.execute({
      sql: `INSERT INTO tasks 
            (project_id, title, description, status, priority, due_date, estimated_hours, actual_hours, tags, assigned_to, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        project_id,
        title.trim(),
        description || "",
        status || "todo",
        priority || "medium",
        due_date || null,
        estimated_hours || 0,
        actual_hours || 0,
        tags || "",
        assigned_to || "",
        now,
        now,
      ],
    });

    const newTaskId = Number(res.lastInsertRowid);

    // Insert subtasks if provided
    if (Array.isArray(subtasks) && subtasks.length > 0) {
      for (const st of subtasks) {
        if (st.title && st.title.trim()) {
          await db.execute({
            sql: `INSERT INTO subtasks (task_id, title, completed) VALUES (?, ?, ?)`,
            args: [newTaskId, st.title.trim(), st.completed ? 1 : 0],
          });
        }
      }
    }

    // Log activity
    await db.execute({
      sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
      args: [
        "إضافة مهمة",
        `تم إدراج المهمة الجديدة "${title}" بواسطة ${session.name} في SQLite.`,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "تم إضافة المهمة بنجاح",
      taskId: newTaskId,
    });
  } catch (error: any) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل إضافة المهمة" },
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

    const {
      id,
      project_id,
      title,
      description,
      status,
      priority,
      due_date,
      estimated_hours,
      actual_hours,
      tags,
      assigned_to,
      subtasks,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف المهمة مطلوب" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    await db.execute({
      sql: `UPDATE tasks 
            SET project_id = COALESCE(?, project_id),
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                status = COALESCE(?, status),
                priority = COALESCE(?, priority),
                due_date = ?,
                estimated_hours = COALESCE(?, estimated_hours),
                actual_hours = COALESCE(?, actual_hours),
                tags = COALESCE(?, tags),
                assigned_to = COALESCE(?, assigned_to),
                updated_at = ?
            WHERE id = ?`,
      args: [
        project_id ?? null,
        title ?? null,
        description ?? null,
        status ?? null,
        priority ?? null,
        due_date ?? null,
        estimated_hours ?? null,
        actual_hours ?? null,
        tags ?? null,
        assigned_to ?? null,
        now,
        id,
      ],
    });

    // Sync subtasks if provided
    if (subtasks !== undefined && Array.isArray(subtasks)) {
      // Very simple sync: delete old, insert new (for simplicity and matching POST)
      await db.execute({
        sql: `DELETE FROM subtasks WHERE task_id = ?`,
        args: [id],
      });
      for (const st of subtasks) {
        if (st.title && st.title.trim()) {
          await db.execute({
            sql: `INSERT INTO subtasks (task_id, title, completed) VALUES (?, ?, ?)`,
            args: [id, st.title.trim(), st.completed ? 1 : 0],
          });
        }
      }
    }

    // Log activity
    await db.execute({
      sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
      args: [
        "تحديث مهمة",
        `تم تحديث بيانات المهمة #${id} بواسطة ${session.name} في SQLite.`,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث المهمة بنجاح",
    });
  } catch (error: any) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل تحديث المهمة" },
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
        { success: false, error: "معرف المهمة مطلوب" },
        { status: 400 },
      );
    }

    // Delete subtasks
    await db.execute({
      sql: `DELETE FROM subtasks WHERE task_id = ?`,
      args: [id],
    });

    // Delete task
    await db.execute({
      sql: `DELETE FROM tasks WHERE id = ?`,
      args: [id],
    });

    // Log Activity
    await db.execute({
      sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
      args: [
        "حذف مهمة",
        `تم حذف المهمة #${id} بواسطة ${session.name} من SQLite.`,
      ],
    });

    return NextResponse.json({ success: true, message: "تم حذف المهمة بنجاح" });
  } catch (error: any) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل حذف المهمة" },
      { status: 500 },
    );
  }
}
