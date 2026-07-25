import { NextResponse } from "next/server";
import { initDatabase, getDbClient } from "@/lib/db";

export async function GET() {
  try {
    await initDatabase();
    const db = getDbClient();
    const res = await db.execute("SELECT COUNT(*) as count FROM users");
    const count = Number(res.rows[0]?.count || 0);
    return NextResponse.json({ needsSetup: count === 0 });
  } catch {
    return NextResponse.json({ needsSetup: true });
  }
}
