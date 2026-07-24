"use client";

import React, { useState, useEffect } from "react";
import { authFetch } from "@/lib/clientAuth";
import {
  Database,
  Table,
  Terminal,
  Download,
  Upload,
  RefreshCw,
  RotateCcw,
  Play,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
} from "lucide-react";

interface SqliteManagerViewProps {
  onRefreshData: () => void;
}

export const SqliteManagerView: React.FC<SqliteManagerViewProps> = ({
  onRefreshData,
}) => {
  const [selectedTable, setSelectedTable] = useState<string>("tasks");
  const [tables, setTables] = useState<string[]>([]);
  const [tableInfo, setTableInfo] = useState<Record<string, number>>({});
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Custom SQL Console state
  const [sqlQuery, setSqlQuery] = useState<string>(
    'SELECT * FROM tasks WHERE priority = "high";',
  );
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isExecutingSql, setIsExecutingSql] = useState<boolean>(false);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // Fetch Table Data
  const fetchDbInfo = async (tableName: string) => {
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/db/query?table=${tableName}`);
      const data = await res.json();
      if (data.success) {
        setTables(data.tables || []);
        setTableInfo(data.tableInfo || {});
        setColumns(data.columns || []);
        setRows(data.rows || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) {
        await fetchDbInfo(selectedTable);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [selectedTable]);

  // Execute manual SQL query
  const handleExecuteSql = async () => {
    if (!sqlQuery.trim()) return;

    setIsExecutingSql(true);
    setSqlError(null);
    setQueryResult(null);

    try {
      const res = await authFetch("/api/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute_sql",
          query: sqlQuery,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setQueryResult(data);
        fetchDbInfo(selectedTable);
        onRefreshData();
      } else {
        setSqlError(data.error || "خطأ في استعلام SQL");
      }
    } catch (err: any) {
      setSqlError(err.message || "خطأ في الاتصال");
    } finally {
      setIsExecutingSql(false);
    }
  };

  // Export JSON Backup
  const handleExportBackup = async () => {
    try {
      const res = await authFetch("/api/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_backup" }),
      });
      const data = await res.json();

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sqlite_backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("فشل تصدير قاعدة البيانات");
    }
  };

  // Import JSON Restore
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.data) {
          const res = await authFetch("/api/db/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "restore_backup",
              backupData: json.data,
            }),
          });
          const resData = await res.json();
          if (resData.success) {
            alert("تم استعادة قاعدة بيانات SQLite بنجاح!");
            fetchDbInfo(selectedTable);
            onRefreshData();
          }
        }
      } catch (err) {
        alert("ملف نسخة احتياطية غير صالح");
      }
    };
    reader.readAsText(file);
  };

  // Reset Database
  const handleResetDb = async () => {
    if (
      !confirm(
        "هل أنت تأكد من إرجاع قاعدة بيانات SQLite إلى حالتها الأولى مع الجداول الافتراضية؟",
      )
    ) {
      return;
    }

    try {
      const res = await authFetch("/api/db/query", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        alert("تم إعادة ضبط قاعدة البيانات SQLite بملف sqlite.db بنجاح.");
        fetchDbInfo(selectedTable);
        onRefreshData();
      }
    } catch (err) {
      alert("فشل إعادة الضبط");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">
                إدارة وحالة قاعدة بيانات SQLite
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                sqlite.db
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              محرك استعلامات وتخزين محلي مباشر جداول: Projects, Tasks, Subtasks,
              Activity_Logs.
            </p>
          </div>
        </div>

        {/* Database Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportBackup}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير نسخة احتياطية (JSON)</span>
          </button>

          <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>استعادة نسخة</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            onClick={handleResetDb}
            className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط DB</span>
          </button>
        </div>
      </div>

      {/* SQL Console Panel */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2 text-blue-400">
            <Terminal className="w-4 h-4" />
            محرر استعلامات SQL المباشر (SQL Console)
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">
            SQLite Dialect
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            placeholder="أدخل استعلام SQL هنا (مثال: SELECT * FROM tasks;)"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 outline-none focus:border-blue-500"
          />
          <button
            onClick={handleExecuteSql}
            disabled={isExecutingSql}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>تنفيذ SQL</span>
          </button>
        </div>

        {/* Console Result or Error */}
        {sqlError && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{sqlError}</span>
          </div>
        )}

        {queryResult && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span>نتائج الاستعلام:</span>
              <span className="font-mono text-[11px]">
                Rows affected:{" "}
                {queryResult.rowsAffected ?? queryResult.rows?.length ?? 0}
              </span>
            </div>
            {queryResult.rows && queryResult.rows.length > 0 && (
              <div className="max-h-48 overflow-auto">
                <pre className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
                  {JSON.stringify(queryResult.rows, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tables & Inspector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Table className="w-4 h-4 text-blue-600" />
            جداول قاعدة البيانات SQLite
          </h3>
          <button
            onClick={() => fetchDbInfo(selectedTable)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table Selection Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          {tables.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTable(t)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedTable === t
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>{t}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  selectedTable === t
                    ? "bg-blue-700 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {tableInfo[t] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Selected Table Data Grid */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold font-mono">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="p-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
              {rows.map((r, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50">
                  {columns.map((col) => (
                    <td key={col} className="p-3 max-w-xs truncate">
                      {r[col] !== null && r[col] !== undefined
                        ? String(r[col])
                        : "NULL"}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length || 1}
                    className="p-6 text-center text-slate-400 font-sans"
                  >
                    لا توجد بيانات مسجلة في هذا الجدول حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
