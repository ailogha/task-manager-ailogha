import { NextRequest, NextResponse } from "next/server";
import { initDatabase, getDbClient } from "@/lib/db";
import { verifySession, isElevatedUser } from "@/lib/auth";

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

    if (!isElevatedUser(session)) {
      return NextResponse.json(
        {
          success: false,
          error: "ليس لديك الصلاحيات الكافية لاستعراض قاعدة البيانات.",
        },
        { status: 403 },
      );
    }

    await initDatabase();
    const db = getDbClient();
    const { searchParams } = new URL(req.url);
    const table = searchParams.get("table");

    // Get list of tables
    const tablesRes = await db.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    const tables = tablesRes.rows.map((row: any) => row.name);

    // Get table counts
    const tableInfo: Record<string, number> = {};
    for (const tName of tables) {
      const cntRes = await db.execute(`SELECT COUNT(*) as cnt FROM ${tName}`);
      tableInfo[tName as string] = Number(cntRes.rows[0]?.cnt || 0);
    }

    let selectedTableRows: any[] = [];
    let selectedTableColumns: string[] = [];

    if (table && tables.includes(table)) {
      const rowsRes = await db.execute(
        `SELECT * FROM ${table} ORDER BY 1 DESC LIMIT 50`,
      );
      selectedTableRows = rowsRes.rows;

      const colRes = await db.execute(`PRAGMA table_info(${table})`);
      selectedTableColumns = colRes.rows.map((r: any) => r.name);
    }

    return NextResponse.json({
      success: true,
      dbFile: "sqlite.db",
      tables,
      tableInfo,
      selectedTable: table || null,
      columns: selectedTableColumns,
      rows: selectedTableRows,
    });
  } catch (error: any) {
    console.error("Error fetching SQLite db query info:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطأ في استعلام قاعدة البيانات",
      },
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

    if (!isElevatedUser(session)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء على قاعدة البيانات.",
        },
        { status: 403 },
      );
    }

    await initDatabase();
    const db = getDbClient();
    const body = await req.json();

    const { action, query, backupData } = body;

    if (action === "execute_sql") {
      if (!query || typeof query !== "string") {
        return NextResponse.json(
          { success: false, error: "استعلام SQL غير صالح" },
          { status: 400 },
        );
      }

      // Check for security or basic execution
      const trimmed = query.trim();
      const res = await db.execute(trimmed);

      // Log execution
      await db.execute({
        sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
        args: [
          "تنفيذ SQL",
          `تم تنفيذ استعلام SQL يدوي من قبل ${session.name}: ${trimmed.slice(0, 50)}...`,
        ],
      });

      return NextResponse.json({
        success: true,
        rowsAffected: res.rowsAffected,
        columns: res.columns,
        rows: res.rows,
      });
    }

    if (action === "export_backup") {
      const projects = (await db.execute("SELECT * FROM projects")).rows;
      const tasks = (await db.execute("SELECT * FROM tasks")).rows;
      const subtasks = (await db.execute("SELECT * FROM subtasks")).rows;
      const activity_logs = (await db.execute("SELECT * FROM activity_logs"))
        .rows;

      return NextResponse.json({
        success: true,
        exportDate: new Date().toISOString(),
        database: "SQLite",
        data: {
          projects,
          tasks,
          subtasks,
          activity_logs,
        },
      });
    }

    if (action === "restore_backup" && backupData) {
      if (backupData.projects && Array.isArray(backupData.projects)) {
        await db.execute("DELETE FROM subtasks");
        await db.execute("DELETE FROM tasks");
        await db.execute("DELETE FROM projects");

        for (const p of backupData.projects) {
          await db.execute({
            sql: `INSERT INTO projects (id, name, description, color, icon, category, status, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              p.id,
              p.name,
              p.description || "",
              p.color || "#3b82f6",
              p.icon || "folder",
              p.category || "عام",
              p.status || "active",
              p.created_at || new Date().toISOString(),
            ],
          });
        }

        if (backupData.tasks && Array.isArray(backupData.tasks)) {
          for (const t of backupData.tasks) {
            await db.execute({
              sql: `INSERT INTO tasks (id, project_id, title, description, status, priority, due_date, estimated_hours, actual_hours, tags, assigned_to, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                t.id,
                t.project_id,
                t.title,
                t.description || "",
                t.status || "todo",
                t.priority || "medium",
                t.due_date || null,
                t.estimated_hours || 0,
                t.actual_hours || 0,
                t.tags || "",
                t.assigned_to || "",
                t.created_at || new Date().toISOString(),
                t.updated_at || new Date().toISOString(),
              ],
            });
          }
        }

        if (backupData.subtasks && Array.isArray(backupData.subtasks)) {
          for (const st of backupData.subtasks) {
            await db.execute({
              sql: `INSERT INTO subtasks (id, task_id, title, completed) VALUES (?, ?, ?, ?)`,
              args: [st.id, st.task_id, st.title, st.completed ? 1 : 0],
            });
          }
        }

        await db.execute({
          sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
          args: [
            "استعادة نسخة احتياطية",
            `تم استعادة بيانات SQLite كاملة بنجاح من قبل ${session.name}.`,
          ],
        });

        return NextResponse.json({
          success: true,
          message: "تم استعادة النسخة الاحتياطية بنجاح في SQLite",
        });
      }
    }

    return NextResponse.json(
      { success: false, error: "إجراء غير معروف" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Error executing DB query/action:", error);
    return NextResponse.json(
      { success: false, error: error.message || "خطأ في تنفيذ العملية" },
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

    if (session.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "إعادة ضبط قاعدة البيانات متاحة فقط للمدير العام للنظام.",
        },
        { status: 403 },
      );
    }

    await initDatabase();
    const db = getDbClient();

    await db.execute("DELETE FROM subtasks");
    await db.execute("DELETE FROM tasks");
    await db.execute("DELETE FROM projects");
    await db.execute("DELETE FROM activity_logs");

    // Re-seed default values
    await initDatabase();

    await db.execute({
      sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
      args: [
        "إعادة ضبط المصنع",
        `تم إعادة تهيئة قاعدة البيانات بالكامل بواسطة ${session.name}.`,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "تم إعادة ضبط قاعدة بيانات SQLite وقيمها الافتراضية بنجاح",
    });
  } catch (error: any) {
    console.error("Error resetting database:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "فشل إعادة ضبط قاعدة البيانات",
      },
      { status: 500 },
    );
  }
}
