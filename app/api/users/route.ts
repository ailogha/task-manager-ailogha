import { NextRequest, NextResponse } from "next/server";
import {
  getDbClient,
  initDatabase,
  User,
  hashPassword,
} from "@/lib/db";
import { verifySession, isElevatedUser } from "@/lib/auth";

/**
 * GET /api/users
 * Retrieve all users from SQLite with optional filter by role or status.
 */
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
    const role = searchParams.get("role");
    const search = searchParams.get("search");

    let query = "SELECT * FROM users";
    const params: any[] = [];
    const conditions: string[] = [];

    if (role && role !== "all") {
      conditions.push("role = ?");
      params.push(role);
    }

    if (search) {
      conditions.push("(name LIKE ? OR email LIKE ? OR job_title LIKE ?)");
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY id ASC";

    const result = await db.execute({
      sql: query,
      args: params,
    });

    const users: User[] = result.rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name || ""),
      email: String(row.email || ""),
      password_hash: String(row.password_hash || ""),
      role: (row.role as any) || "member",
      status: (row.status as any) || "active",
      job_title: String(row.job_title || ""),
      permissions: String(row.permissions || "[]"),
      avatar_color: String(row.avatar_color || "#3b82f6"),
      created_at: String(row.created_at || ""),
      last_login: row.last_login ? String(row.last_login) : null,
    }));

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error("API Users GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "فشل جلب قائمة المستخدمين من SQLite",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/users
 * Create a new user / manager / admin in SQLite.
 */
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
          error: "ليس لديك الصلاحيات الكافية لإنشاء حساب مستخدم جديد.",
        },
        { status: 403 },
      );
    }

    await initDatabase();
    const db = getDbClient();
    const body = await req.json();

    const {
      name,
      email,
      password,
      role,
      job_title,
      permissions,
      avatar_color,
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "الرجاء إدخال الاسم والبريد الإلكتروني وكلمة المرور",
        },
        { status: 400 },
      );
    }

    // Check email duplication
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "البريد الإلكتروني مستخدم بالفعل لنشاط آخر" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    const userRole = role || "member";
    const userPermissions = Array.isArray(permissions)
      ? JSON.stringify(permissions)
      : permissions || '["manage_tasks"]';
    const color = avatar_color || "#3b82f6";

    const result = await db.execute({
      sql: `INSERT INTO users (name, email, password_hash, role, status, job_title, permissions, avatar_color)
            VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
      args: [
        name,
        email.toLowerCase().trim(),
        passwordHash,
        userRole,
        job_title || "عضو فريق",
        userPermissions,
        color,
      ],
    });

    // Log Activity
    await db.execute({
      sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
      args: [
        "إضافة مستخدم جديد",
        `تم إضافة الحساب: ${name} (${email}) بدور [${userRole}] في SQLite بواسطة ${session.name}.`,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "تم إضافة المستخدم بنجاح في قاعدة البيانات",
      id: Number(result.lastInsertRowid),
    });
  } catch (error: any) {
    console.error("API Users POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل إضافة المستخدم" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/users
 * Update user details, role, permissions, password, or status.
 */
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

    if (!isElevatedUser(session)) {
      return NextResponse.json(
        {
          success: false,
          error: "ليس لديك الصلاحيات الكافية لتعديل حسابات الأعضاء.",
        },
        { status: 403 },
      );
    }

    await initDatabase();
    const db = getDbClient();
    const body = await req.json();

    const {
      id,
      name,
      email,
      password,
      role,
      status,
      job_title,
      permissions,
      avatar_color,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرّف المستخدم مطلوب" },
        { status: 400 },
      );
    }

    const updates: string[] = [];
    const args: any[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      args.push(name);
    }
    if (email !== undefined) {
      updates.push("email = ?");
      args.push(email);
    }
    if (password) {
      updates.push("password_hash = ?");
      args.push(await hashPassword(password));
    }
    if (role !== undefined) {
      updates.push("role = ?");
      args.push(role);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      args.push(status);
    }
    if (job_title !== undefined) {
      updates.push("job_title = ?");
      args.push(job_title);
    }
    if (permissions !== undefined) {
      updates.push("permissions = ?");
      args.push(
        Array.isArray(permissions) ? JSON.stringify(permissions) : permissions,
      );
    }
    if (avatar_color !== undefined) {
      updates.push("avatar_color = ?");
      args.push(avatar_color);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "لا توجد بيانات للتحديث" },
        { status: 400 },
      );
    }

    args.push(id);
    const query = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;

    await db.execute({
      sql: query,
      args,
    });

    // Log Activity
    await db.execute({
      sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
      args: [
        "تعديل حساب/صلاحيات",
        `تم تحديث بيانات المستخدم ID: ${id} في SQLite بواسطة المسؤول: ${session.name}.`,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث بيانات المستخدم بنجاح",
    });
  } catch (error: any) {
    console.error("API Users PUT Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل تعديل المستخدم" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/users
 * Delete user account from SQLite.
 */
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

    if (!isElevatedUser(session)) {
      return NextResponse.json(
        {
          success: false,
          error: "ليس لديك الصلاحيات الكافية لحذف حسابات الأعضاء.",
        },
        { status: 403 },
      );
    }

    await initDatabase();
    const db = getDbClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرّف المستخدم مطلوب" },
        { status: 400 },
      );
    }

    // Prevent self-deletion
    if (Number(id) === session.id) {
      return NextResponse.json(
        { success: false, error: "لا يمكنك حذف حسابك الفعلي النشط بنفسك!" },
        { status: 400 },
      );
    }

    await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [Number(id)],
    });

    // Log Activity
    await db.execute({
      sql: `INSERT INTO activity_logs (action, details) VALUES (?, ?)`,
      args: [
        "حذف مستخدم",
        `تم حذف الحساب ID: ${id} نهائياً بواسطة المسؤول: ${session.name}.`,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "تم حذف المستخدم بنجاح",
    });
  } catch (error: any) {
    console.error("API Users DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل حذف المستخدم" },
      { status: 500 },
    );
  }
}
