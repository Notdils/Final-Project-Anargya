import ExcelJS from "exceljs";
import { currentUser } from "@/lib/supabase/server";
import { parseDays, parseStatus, receiptsForExport } from "@/lib/admin";

// Draft column set until Finance (FAB) confirms the fields.
const COLS = [
  ["receipt_no", "Receipt no"], ["created_at", "Created (UTC)"], ["paid_at", "Paid at (UTC)"], ["buyer_name", "Buyer"], ["email", "Email"],
  ["items", "Items"], ["qty", "Qty"], ["subtotal_jpy", "Subtotal JPY"], ["shipping_jpy", "Shipping JPY"], ["total_jpy", "Total JPY"],
  ["charged_idr", "Charged IDR"], ["fx_rate", "FX IDR/JPY"], ["method", "Method"], ["midtrans_txn_id", "Midtrans txn"], ["status", "Status"], ["oversold", "Oversold (refund or restock)"],
] as const;

// Block CSV/Excel formula injection from user-entered fields.
const safe = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

export async function GET(req: Request) {
  const { role } = await currentUser();
  if (role !== "admin") return new Response("forbidden", { status: 403 }); // middleware also checks

  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "xlsx" ? "xlsx" : "csv";
  const rows = await receiptsForExport({ q: (sp.get("q") ?? "").slice(0, 60), status: parseStatus(sp.get("status") ?? undefined), days: parseDays(sp.get("days") ?? undefined) });
  const flat = rows.map((o) => ({
    ...o,
    items: (o.order_items ?? []).map((i) => `${i.code} x${i.qty}`).join("; "),
    qty: (o.order_items ?? []).reduce((s, i) => s + i.qty, 0),
  })) as Record<string, unknown>[];
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const esc = (v: unknown) => `"${safe(v).replace(/"/g, '""')}"`;
    const csv = [COLS.map(([, h]) => esc(h)).join(","), ...flat.map((r) => COLS.map(([k]) => esc(r[k])).join(","))].join("\r\n");
    return new Response("﻿" + csv, {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="anargya-receipts-${stamp}.csv"`, "cache-control": "no-store" },
    });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Anargya Corp";
  const ws = wb.addWorksheet("Receipts", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLS.map(([key, header]) => ({ key, header, width: Math.max(12, header.length + 4) }));
  ws.getRow(1).font = { bold: true };
  for (const r of flat) {
    const row: Record<string, unknown> = {};
    for (const [k] of COLS) row[k] = typeof r[k] === "number" ? r[k] : safe(r[k]);
    ws.addRow(row);
  }
  for (const k of ["subtotal_jpy", "shipping_jpy", "total_jpy"]) ws.getColumn(k).numFmt = '"¥"#,##0';
  ws.getColumn("charged_idr").numFmt = '"Rp"#,##0';
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="anargya-receipts-${stamp}.xlsx"`, "cache-control": "no-store" },
  });
}
