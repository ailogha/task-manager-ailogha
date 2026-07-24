"use client";

import { SqliteManagerView } from "@/components/SqliteManagerView";

export default function SqlitePage() {
  return <SqliteManagerView onRefreshData={() => window.dispatchEvent(new Event("app-refresh"))} />;
}
