// app/api/upload/jsa/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("fileUrl") || "";
    const requestedFilename = searchParams.get("filename") || "";

    let filename = requestedFilename;
    if (!filename && fileUrl) {
      // Ekstrak nama file dari URL (misal: /api/upload/jsa/jsa_xxx.xlsx)
      const parts = fileUrl.split("/");
      filename = parts[parts.length - 1];
    }

    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", "uploads", "jsa", filename);
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: "File JSA tidak ditemukan di server" }, { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase();
    if (![".xlsx", ".xls"].includes(ext)) {
      return NextResponse.json(
        { error: "Endpoint preview spreadsheet hanya untuk file Excel (.xlsx, .xls)" },
        { status: 400 }
      );
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(filePath);
    } catch (readErr: any) {
      // Jika format xls biner lama yang tidak didukung exceljs.xlsx
      return NextResponse.json({
        success: false,
        isSupported: false,
        fileName: filename,
        error: "File Excel menggunakan format biner lama (.xls) atau terproteksi. Silakan unduh untuk melihat.",
        downloadUrl: `/api/upload/jsa/${filename}`,
      });
    }

    const sheets: Array<{
      name: string;
      rowCount: number;
      columnCount: number;
      data: string[][];
    }> = [];

    workbook.eachSheet((worksheet) => {
      const rowsData: string[][] = [];
      let maxCols = 0;

      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const rowVals: string[] = [];
        // row.values di ExcelJS adalah 1-indexed (elemen ke-0 undefined)
        const rawVals = Array.isArray(row.values) ? row.values.slice(1) : [];

        for (const val of rawVals) {
          if (val === null || val === undefined) {
            rowVals.push("");
          } else if (typeof val === "object") {
            if ("result" in val && val.result !== undefined && val.result !== null) {
              rowVals.push(String(val.result));
            } else if ("text" in val && val.text) {
              rowVals.push(String(val.text));
            } else if ("richText" in val && Array.isArray((val as any).richText)) {
              rowVals.push((val as any).richText.map((rt: any) => rt.text || "").join(""));
            } else if (val instanceof Date) {
              rowVals.push(val.toLocaleDateString("id-ID"));
            } else {
              rowVals.push(JSON.stringify(val));
            }
          } else {
            rowVals.push(String(val));
          }
        }

        if (rowVals.length > maxCols) maxCols = rowVals.length;
        rowsData.push(rowVals);
      });

      // Normalisasi agar setiap row memiliki panjang kolom yang sama
      const normalizedData = rowsData.map((r) => {
        while (r.length < maxCols) r.push("");
        return r;
      });

      sheets.push({
        name: worksheet.name,
        rowCount: normalizedData.length,
        columnCount: maxCols,
        data: normalizedData,
      });
    });

    return NextResponse.json({
      success: true,
      isSupported: true,
      fileName: filename,
      downloadUrl: `/api/upload/jsa/${filename}`,
      sheets,
    });
  } catch (err: any) {
    console.error("[GET /api/upload/jsa/preview]", err);
    return NextResponse.json({ error: err.message || "Gagal memproses file Excel" }, { status: 500 });
  }
}
