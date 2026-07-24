import { NextRequest, NextResponse } from "next/server";
import { getDbClient, initDatabase } from "@/lib/db";
import { verifySession } from "@/lib/auth";

/**
 * GET /api/ai-providers
 * Returns all AI providers with their models and current feature assignments.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "غير مصرح. يرجى تسجيل الدخول." },
        { status: 401 },
      );
    }

    await initDatabase();
    const db = getDbClient();

    // Fetch all providers
    const providersRes = await db.execute(
      "SELECT * FROM ai_providers ORDER BY id ASC",
    );

    // Fetch all models
    const modelsRes = await db.execute(
      "SELECT * FROM ai_models ORDER BY provider_id ASC",
    );

    // Fetch assignments
    const assignmentsRes = await db.execute("SELECT * FROM model_assignments");

    // Group models by provider
    const modelsByProvider: Record<number, any[]> = {};
    for (const m of modelsRes.rows) {
      const pid = Number(m.provider_id);
      if (!modelsByProvider[pid]) modelsByProvider[pid] = [];
      modelsByProvider[pid].push({
        id: Number(m.id),
        provider_id: pid,
        model_id: String(m.model_id),
        display_name: String(m.display_name || m.model_id),
        is_available: Number(m.is_available),
      });
    }

    // Build provider list (mask API keys)
    const providers = providersRes.rows.map((p) => ({
      id: Number(p.id),
      name: String(p.name),
      base_url: String(p.base_url),
      api_key_masked: maskApiKey(String(p.api_key)),
      api_key_set: !!p.api_key,
      is_active: Number(p.is_active),
      created_at: String(p.created_at),
      models: modelsByProvider[Number(p.id)] || [],
    }));

    const assignments: Record<string, any> = {};
    for (const a of assignmentsRes.rows) {
      assignments[String(a.feature_key)] = {
        provider_id: Number(a.provider_id) || null,
        model_id: String(a.model_id) || null,
      };
    }

    return NextResponse.json({ success: true, providers, assignments });
  } catch (error: any) {
    console.error("AI Providers GET Error:", error);
    return NextResponse.json(
      { success: false, error: "فشل جلب المزودين" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ai-providers
 * Add a new provider. Automatically fetches models from the endpoint.
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
        { success: false, error: "فقط المدير العام يمكنه إضافة مزودين." },
        { status: 403 },
      );
    }

    await initDatabase();
    const db = getDbClient();
    const body = await req.json();
    const { name, base_url, api_key } = body;

    if (!name || !base_url || !api_key) {
      return NextResponse.json(
        {
          success: false,
          error: "الاسم ورابط الوصول ومفتاح API مطلوبة جميعاً",
        },
        { status: 400 },
      );
    }

    // Normalize URL (remove trailing slash)
    const normalizedUrl = base_url.trim().replace(/\/+$/, "");

    // Insert provider
    const insertRes = await db.execute({
      sql: `INSERT INTO ai_providers (name, base_url, api_key, is_active) VALUES (?, ?, ?, 1)`,
      args: [name.trim(), normalizedUrl, api_key.trim()],
    });

    const providerId = Number(insertRes.lastInsertRowid);

    // Try to fetch models automatically
    const models = await fetchModelsFromProvider(normalizedUrl, api_key.trim());

    if (models.length > 0) {
      for (const model of models) {
        await db.execute({
          sql: `INSERT OR IGNORE INTO ai_models (provider_id, model_id, display_name, is_available) VALUES (?, ?, ?, 1)`,
          args: [providerId, model.id, model.name || model.id],
        });
      }
    }

    // Log
    await db.execute({
      sql: "INSERT INTO activity_logs (action, details) VALUES (?, ?)",
      args: [
        "إضافة مزود ذكاء اصطناعي",
        `تم إضافة المزود "${name}" (${normalizedUrl}) مع ${models.length} نموذج.`,
      ],
    });

    return NextResponse.json({
      success: true,
      message: `تم إضافة المزود بنجاح مع ${models.length} نموذج متاح`,
      provider_id: providerId,
      models_count: models.length,
    });
  } catch (error: any) {
    console.error("AI Providers POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل إضافة المزود" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/ai-providers
 * Update a provider (name, base_url, api_key, is_active).
 * If api_key or base_url changes, re-fetch models.
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

    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "فقط المدير العام يمكنه تعديل المزودين." },
        { status: 403 },
      );
    }

    await initDatabase();
    const db = getDbClient();
    const body = await req.json();
    const { id, name, base_url, api_key, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف المزود مطلوب" },
        { status: 400 },
      );
    }

    // Get current values
    const current = await db.execute({
      sql: "SELECT * FROM ai_providers WHERE id = ?",
      args: [id],
    });

    if (current.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "المزود غير موجود" },
        { status: 404 },
      );
    }

    const currentRow = current.rows[0];
    const newName = name ?? currentRow.name;
    const newUrl = (base_url || currentRow.base_url)
      .trim()
      .replace(/\/+$/, "");
    const newKey = api_key || currentRow.api_key;
    const newActive = is_active !== undefined ? (is_active ? 1 : 0) : currentRow.is_active;

    await db.execute({
      sql: `UPDATE ai_providers SET name = ?, base_url = ?, api_key = ?, is_active = ? WHERE id = ?`,
      args: [newName, newUrl, newKey, newActive, id],
    });

    // If URL or key changed, re-fetch models
    if (base_url || api_key) {
      const models = await fetchModelsFromProvider(newUrl, newKey);

      if (models.length > 0) {
        // Clear old models and re-insert
        await db.execute({
          sql: "DELETE FROM ai_models WHERE provider_id = ?",
          args: [id],
        });

        for (const model of models) {
          await db.execute({
            sql: `INSERT INTO ai_models (provider_id, model_id, display_name, is_available) VALUES (?, ?, ?, 1)`,
            args: [id, model.id, model.name || model.id],
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث المزود بنجاح",
    });
  } catch (error: any) {
    console.error("AI Providers PUT Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل تحديث المزود" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/ai-providers?id=X
 */
export async function DELETE(req: NextRequest) {
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
        { success: false, error: "فقط المدير العام يمكنه حذف المزودين." },
        { status: 403 },
      );
    }

    await initDatabase();
    const db = getDbClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف المزود مطلوب" },
        { status: 400 },
      );
    }

    // Delete models first
    await db.execute({
      sql: "DELETE FROM ai_models WHERE provider_id = ?",
      args: [Number(id)],
    });

    // Delete provider
    await db.execute({
      sql: "DELETE FROM ai_providers WHERE id = ?",
      args: [Number(id)],
    });

    // Clear any assignments pointing to this provider
    await db.execute({
      sql: "UPDATE model_assignments SET provider_id = NULL, model_id = NULL WHERE provider_id = ?",
      args: [Number(id)],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("AI Providers DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: "فشل حذف المزود" },
      { status: 500 },
    );
  }
}

// ============================================================
// Helper: Fetch models from an OpenAI-compatible endpoint
// ============================================================
async function fetchModelsFromProvider(
  baseUrl: string,
  apiKey: string,
): Promise<{ id: string; name?: string }[]> {
  try {
    const modelsEndpoint = `${baseUrl}/models`;
    const res = await fetch(modelsEndpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(
        `Failed to fetch models: ${res.status} ${res.statusText}`,
      );
      return [];
    }

    const data = await res.json();

    // OpenAI-compatible format: { data: [{ id: "gpt-4o", ... }, ...] }
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((m: any) => ({
        id: String(m.id),
        name: m.name || m.id,
      }));
    }

    // Some providers return a flat array
    if (Array.isArray(data)) {
      return data.map((m: any) => ({
        id: String(m.id || m),
        name: m.name || m.id || m,
      }));
    }

    return [];
  } catch (err) {
    console.error("Fetch models error:", err);
    return [];
  }
}

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "****";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}
