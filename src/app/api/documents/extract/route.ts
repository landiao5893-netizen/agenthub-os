import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import { strFromU8, unzipSync } from "fflate";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_TEXT_LENGTH = 50_000;

function decodeXml(text: string) {
  return text
    .replace(/<w:tab\s*\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractDocx(buffer: Buffer) {
  const archive = unzipSync(new Uint8Array(buffer));
  const documentXml = archive["word/document.xml"];
  if (!documentXml) throw new Error("DOCX 文件缺少正文内容");
  return decodeXml(strFromU8(documentXml));
}

function extractExcel(buffer: Buffer) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellFormula: true,
    cellText: true,
  });
  if (workbook.SheetNames.length === 0) throw new Error("Excel 工作簿中没有工作表");

  const sections = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : null;
    if (!range) return `# 工作表：${sheetName}\n（空工作表）`;

    const rows: string[] = [];
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      const values: string[] = [];
      for (let column = range.s.c; column <= range.e.c; column += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
        if (!cell) {
          values.push("");
          continue;
        }
        const displayed = cell.w ?? (cell.v == null ? "" : String(cell.v));
        values.push(cell.f ? `${displayed} [公式: =${cell.f}]` : displayed);
      }
      while (values.length > 0 && values.at(-1) === "") values.pop();
      if (values.length > 0) rows.push(values.join("\t"));
    }
    return `# 工作表：${sheetName}\n${rows.join("\n") || "（空工作表）"}`;
  });

  return {
    text: sections.join("\n\n"),
    sheetNames: workbook.SheetNames,
    sheetCount: workbook.SheetNames.length,
  };
}

async function extractPdf(buffer: Buffer) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "agenthub-pdf-"));
  const inputPath = path.join(tempDir, "document.pdf");
  try {
    await writeFile(inputPath, buffer);
    const { stdout } = await execFileAsync("pdftotext", ["-layout", inputPath, "-"], {
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    let pageCount: number | undefined;
    try {
      const info = await execFileAsync("pdfinfo", [inputPath], {
        encoding: "utf8",
        timeout: 10_000,
        maxBuffer: 1024 * 1024,
      });
      const match = info.stdout.match(/^Pages:\s+(\d+)/m);
      pageCount = match ? Number(match[1]) : undefined;
    } catch {
      // Page count is optional; extracted text remains usable.
    }
    return { text: stdout, pageCount };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "请选择要上传的文件" }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "文件大小必须在 20MB 以内" }, { status: 413 });
    }

    const extension = path.extname(file.name).toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";
    let pageCount: number | undefined;
    let sheetNames: string[] | undefined;
    let sheetCount: number | undefined;

    if (extension === ".pdf") {
      const result = await extractPdf(buffer);
      text = result.text;
      pageCount = result.pageCount;
    } else if (extension === ".docx") {
      text = extractDocx(buffer);
    } else if ([".xlsx", ".xls"].includes(extension)) {
      const result = extractExcel(buffer);
      text = result.text;
      sheetNames = result.sheetNames;
      sheetCount = result.sheetCount;
    } else if ([".txt", ".md", ".csv", ".json"].includes(extension)) {
      text = buffer.toString("utf8");
    } else {
      return NextResponse.json({ ok: false, error: "暂支持 PDF、DOCX、XLSX、XLS、TXT、Markdown、CSV 和 JSON" }, { status: 415 });
    }

    const normalized = text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
    if (!normalized) {
      return NextResponse.json({ ok: false, error: "文件中未识别到文字；扫描版 PDF 暂需先完成 OCR" }, { status: 422 });
    }
    const truncated = normalized.length > MAX_TEXT_LENGTH;

    return NextResponse.json({
      ok: true,
      file: {
        name: file.name,
        size: file.size,
        type: extension.slice(1).toUpperCase(),
        pageCount,
        sheetNames,
        sheetCount,
        text: normalized.slice(0, MAX_TEXT_LENGTH),
        characterCount: normalized.length,
        truncated,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: "文件解析失败：" + message }, { status: 500 });
  }
}