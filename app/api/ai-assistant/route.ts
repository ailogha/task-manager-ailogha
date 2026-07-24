import { NextRequest, NextResponse } from "next/server";
import { getDbClient, initDatabase } from "@/lib/db";
import { verifySession } from "@/lib/auth";

/**
 * POST /api/ai-assistant
 * Uses any configured OpenAI-compatible AI provider to generate tasks or analyze projects.
 *
 * Body: { action: "generate_subtasks" | "analyze_project", projectName, projectDescription, taskList }
 *
 * It looks up the model assigned to the requested feature in the DB.
 * Falls back to smart suggestions if no provider is configured.
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

    await initDatabase();
    const db = getDbClient();

    const {
      action,
      projectName,
      projectDescription,
      taskList,
    } = await req.json();

    // Map actions to feature keys
    const featureKey =
      action === "generate_subtasks" ? "task_generator" : "project_analyzer";

    // Look up the assigned provider + model for this feature
    const assignmentRes = await db.execute({
      sql: `SELECT a.provider_id, a.model_id, p.base_url, p.api_key, p.name as provider_name
            FROM model_assignments a
            LEFT JOIN ai_providers p ON a.provider_id = p.id
            WHERE a.feature_key = ? AND p.is_active = 1`,
      args: [featureKey],
    });

    // If no assignment or provider inactive, fall back to smart suggestions
    if (assignmentRes.rows.length === 0 || !assignmentRes.rows[0]?.base_url) {
      return NextResponse.json({
        success: true,
        ...(action === "generate_subtasks"
          ? {
              tasks: getFallbackTasks(projectName),
            }
          : {
              summary: getFallbackAnalysis(projectName, taskList),
            }),
        note: "لم يتم إعداد مزود ذكاء اصطناعي لهذه الميزة. النتيجة معتمدة على نظام التوليد الذكي المدمج. انتقل إلى صفحة مزودي الذكاء الاصطناعي لإضافة مزود.",
      });
    }

    const provider = assignmentRes.rows[0];
    const baseUrl = String(provider.base_url).replace(/\/+$/, "");
    const apiKey = String(provider.api_key);
    const model = String(provider.model_id || "");

    // Build the prompt based on action
    let systemPrompt = "";
    let userPrompt = "";
    let expectJson = false;

    if (action === "generate_subtasks") {
      expectJson = true;
      systemPrompt =
        "أنت خبير إدارة مشاريع محترف. مهمتك إنشاء خطط مهام دقيقة وواقعية باللغة العربية. أرجع النتائج دائماً بصيغة JSON صالحة فقط بدون أي نص إضافي.";
      userPrompt = `أنشئ خطة مهام مقترحة للمشروع التالي:

اسم المشروع: ${projectName || "مشروع جديد"}
الوصف: ${projectDescription || "بدون وصف متاح"}

أرجع الإجابة فقط بصيغة JSON Array بالشكل التالي:
[
  { "title": "اسم المهمة", "description": "وصف قصير", "estimated_hours": 8, "priority": "high" }
]

القواعد:
- المهام باللغة العربية
- الأولويات: low, medium, high, urgent
- اجعل عدد المهام من 4 إلى 8
- اجعلها منطقية وقابلة للتنفيذ`;
    } else if (action === "analyze_project") {
      systemPrompt =
        "أنت مستشار ذكاء اصطناعي محترف في إدارة المشاريع. قدم تحليلاً عميقاً وتوصيات عملية باللغة العربية.";
      userPrompt = `حلل حالة المشروع التالي وقدم توصيات:

المشروع: ${projectName || "غير محدد"}
المهام الحالية: ${JSON.stringify(taskList || [], null, 2)}

قدم تحليلاً يشمل:
1. تقييم التقدم العام
2. المخاطر المحتملة
3. المهام التي تحتاج اهتماماً عاجلاً
4. توصيات لتحسين الأداء

اكتب التقرير بصيغة واضحة منظمة باللغة العربية.`;
    } else {
      return NextResponse.json(
        { success: false, error: "إجراء غير معروف" },
        { status: 400 },
      );
    }

    // Call the OpenAI-compatible chat completions endpoint
    const chatUrl = `${baseUrl}/chat/completions`;
    const aiRes = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: expectJson ? 2000 : 1500,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI API error:", aiRes.status, errText);
      return NextResponse.json({
        success: true,
        ...(action === "generate_subtasks"
          ? { tasks: getFallbackTasks(projectName) }
          : { summary: getFallbackAnalysis(projectName, taskList) }),
        note: `تعذر الاتصال بمزود الذكاء الاصطناعي (${aiRes.status}). النتيجة احتياطية.`,
      });
    }

    const aiData = await aiRes.json();
    const aiText =
      aiData.choices?.[0]?.message?.content ||
      aiData.choices?.[0]?.text ||
      "";

    if (action === "generate_subtasks") {
      // Try to parse JSON from the response
      try {
        const jsonMatch = aiText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const tasks = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            success: true,
            tasks,
            provider: provider.provider_name,
            model,
          });
        }
      } catch {
        // If parse fails, return raw text
      }

      return NextResponse.json({
        success: true,
        rawText: aiText,
        provider: provider.provider_name,
        model,
      });
    } else {
      return NextResponse.json({
        success: true,
        summary: aiText,
        provider: provider.provider_name,
        model,
      });
    }
  } catch (error: any) {
    console.error("AI Assistant Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطأ في معالجة طلب الذكاء الاصطناعي",
      },
      { status: 500 },
    );
  }
}

// ============================================================
// Fallback generators (when no AI provider is configured)
// ============================================================
function getFallbackTasks(projectName: string) {
  return [
    {
      title: "تحليل المتطلبات والتخطيط الأولي",
      description: `جمع المتطلبات التفصيلية لمشروع ${projectName || "الجديد"} وتحديد النطاق والأهداف`,
      estimated_hours: 6,
      priority: "high",
    },
    {
      title: "التصميم والهيكلة المعمارية",
      description: "تصميم البنية التحتية والمخططات الهيكلية وواجهات المستخدم",
      estimated_hours: 12,
      priority: "high",
    },
    {
      title: "التطوير والبرمجة الأساسية",
      description: "تنفيذ المراحل البرمجية الرئيسية وبناء الوظائف الأساسية",
      estimated_hours: 24,
      priority: "urgent",
    },
    {
      title: "الاختبار وضمان الجودة",
      description: "إجراء اختبارات شاملة لكل الوظائف وإصلاح الأخطاء",
      estimated_hours: 10,
      priority: "medium",
    },
    {
      title: "التوثيق والتسليم النهائي",
      description: "إعداد الوثائق التقنية ودليل المستخدم والتسليم",
      estimated_hours: 6,
      priority: "low",
    },
  ];
}

function getFallbackAnalysis(projectName: string, taskList: any[]) {
  const total = taskList?.length || 0;
  const completed =
    taskList?.filter((t) => t.status === "completed").length || 0;
  const inProgress =
    taskList?.filter((t) => t.status === "in_progress").length || 0;
  const overdue =
    taskList?.filter(
      (t) =>
        t.status !== "completed" &&
        t.due_date &&
        t.due_date < new Date().toISOString().split("T")[0],
    ).length || 0;

  return `## 📊 تحليل المشروع: ${projectName || "غير محدد"}

### نظرة عامة
- إجمالي المهام: ${total}
- المهام المكتملة: ${completed}
- قيد التنفيذ حالياً: ${inProgress}
- المهام المتأخرة: ${overdue}

### التوصيات
1. ${overdue > 0 ? `هناك ${overdue} مهمة متأخرة تحتاج اهتماماً عاجلاً` : "لا توجد مهام متأخرة، الأداء ضمن الجدول الزمني"}
2. نسبة الإنجاز ${total > 0 ? Math.round((completed / total) * 100) : 0}%
3. ركز على إكمال المهام ذات الأولوية العالية أولاً

> 💡 لتحليل أعمق وأكثر تفصيلاً، أضف مزود ذكاء اصطناعي من صفحة الإعدادات.`;
}
