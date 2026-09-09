import type pg from "pg";
import type { RangeFilter } from "@zerde/types";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { getKpi } from "./kpi";
import { getBreakdown } from "./breakdown";

export interface ReportData {
  columns: string[];
  rows: (string | number)[][];
  title: string;
}

export async function buildReportData(
  pool: pg.Pool,
  view: "overview" | "regions" | "themes",
  r: RangeFilter,
): Promise<ReportData> {
  if (view === "overview") {
    const kpi = await getKpi(pool, r);
    return {
      title: "Отчет: Ситуационный центр (Обзор)",
      columns: ["Показатель", "Значение"],
      rows: [
        ["Всего обращений", kpi.total],
        ["Предыдущий период", kpi.prevTotal],
        ["Изменение (%)", Math.round(kpi.deltaPct * 100)],
        ["Доля просроченных (%)", Math.round(kpi.overdueShare * 100)],
        ["Среднее время решения (ч)", kpi.avgCloseHours ?? "—"],
        ["Доля повторных (%)", Math.round(kpi.repeatShare * 100)],
        ["Открыто сейчас", kpi.openNow],
      ],
    };
  }

  if (view === "regions") {
    const bd = await getBreakdown(pool, r, "region");
    return {
      title: "Отчет: Распределение по регионам",
      columns: ["Регион", "Код", "Количество", "Просрочено", "Доля просрочек (%)"],
      rows: bd.map((b) => [
        b.label,
        b.key,
        b.count,
        b.overdue,
        b.count > 0 ? Math.round((b.overdue / b.count) * 100) : 0,
      ]),
    };
  }

  // themes
  const bd = await getBreakdown(pool, r, "theme");
  return {
    title: "Отчет: Распределение по темам",
    columns: ["Тема", "Код", "Количество", "Просрочено", "Доля просрочек (%)"],
    rows: bd.map((b) => [
      b.label,
      b.key,
      b.count,
      b.overdue,
      b.count > 0 ? Math.round((b.overdue / b.count) * 100) : 0,
    ]),
  };
}

export async function toXlsx(data: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  sheet.addRow([data.title]);
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.addRow([]);

  const headerRow = sheet.addRow(data.columns);
  headerRow.font = { bold: true };

  for (const row of data.rows) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function toPdf(data: ReportData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    doc.fontSize(16).text(data.title, { align: "center" });
    doc.moveDown();

    doc.fontSize(10);
    const colWidth = Math.floor((doc.page.width - 80) / (data.columns.length || 1));

    // Header
    let y = doc.y;
    data.columns.forEach((col, i) => {
      doc.text(String(col), 40 + i * colWidth, y, { width: colWidth, lineBreak: false });
    });
    doc.moveDown();

    // Rows
    for (const row of data.rows) {
      y = doc.y;
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = doc.y;
      }
      row.forEach((cell, i) => {
        doc.text(String(cell), 40 + i * colWidth, y, { width: colWidth, lineBreak: false });
      });
      doc.moveDown(0.5);
    }

    doc.end();
  });
}
