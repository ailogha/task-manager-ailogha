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

    // Total Projects Count
    const projCountRes = await db.execute(
      "SELECT COUNT(*) as count FROM projects",
    );
    const totalProjects = Number(projCountRes.rows[0]?.count || 0);

    // Total Tasks Count
    const taskCountRes = await db.execute(
      "SELECT COUNT(*) as count FROM tasks",
    );
    const totalTasks = Number(taskCountRes.rows[0]?.count || 0);

    // Tasks by Status
    const statusRes = await db.execute(`
      SELECT status, COUNT(*) as count 
      FROM tasks 
      GROUP BY status
    `);
    const statusMap: Record<string, number> = {
      todo: 0,
      in_progress: 0,
      review: 0,
      completed: 0,
    };
    statusRes.rows.forEach((row: any) => {
      if (row.status) {
        statusMap[row.status] = Number(row.count || 0);
      }
    });

    // Tasks by Priority
    const priorityRes = await db.execute(`
      SELECT priority, COUNT(*) as count 
      FROM tasks 
      GROUP BY priority
    `);
    const priorityMap: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    priorityRes.rows.forEach((row: any) => {
      if (row.priority) {
        priorityMap[row.priority] = Number(row.count || 0);
      }
    });

    // Projects by Category
    const categoryRes = await db.execute(`
      SELECT category, COUNT(*) as count 
      FROM projects 
      GROUP BY category
    `);
    const categoryBreakdown = categoryRes.rows.map((row: any) => ({
      name: row.category || "غير محدد",
      count: Number(row.count || 0),
    }));

    // Hours calculation
    const hoursRes = await db.execute(`
      SELECT 
        SUM(estimated_hours) as total_estimated,
        SUM(actual_hours) as total_actual
      FROM tasks
    `);
    const totalEstimatedHours = Number(hoursRes.rows[0]?.total_estimated || 0);
    const totalActualHours = Number(hoursRes.rows[0]?.total_actual || 0);

    // Overdue tasks
    const todayStr = new Date().toISOString().split("T")[0];
    const overdueRes = await db.execute({
      sql: `SELECT COUNT(*) as count FROM tasks WHERE status != 'completed' AND due_date IS NOT NULL AND due_date < ?`,
      args: [todayStr],
    });
    const overdueTasksCount = Number(overdueRes.rows[0]?.count || 0);

    // Project progress breakdown
    const projProgressRes = await db.execute(`
      SELECT 
        p.id, p.name, p.color, p.category,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id
    `);

    const projectProgress = projProgressRes.rows.map((row: any) => {
      const total = Number(row.total_tasks || 0);
      const completed = Number(row.completed_tasks || 0);
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        id: Number(row.id),
        name: row.name,
        color: row.color,
        category: row.category,
        total,
        completed,
        percentage,
      };
    });

    // Recent Activity Logs
    const logsRes = await db.execute(`
      SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10
    `);
    const recentActivities = logsRes.rows.map((row: any) => ({
      id: Number(row.id),
      action: row.action,
      details: row.details,
      created_at: row.created_at,
    }));

    const completionRate =
      totalTasks > 0 ? Math.round((statusMap.completed / totalTasks) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalProjects,
        totalTasks,
        completionRate,
        overdueTasksCount,
        totalEstimatedHours,
        totalActualHours,
        statusMap,
        priorityMap,
        categoryBreakdown,
        projectProgress,
        recentActivities,
      },
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل جلب الإحصائيات" },
      { status: 500 },
    );
  }
}
