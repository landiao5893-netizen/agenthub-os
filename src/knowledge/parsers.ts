// ============================================
// Document Parsers — 文档解析引擎
// PDF / Word / Excel / Markdown / 图片 → 纯文本
// ============================================

import { KBDocument, DocumentType } from "./types";

interface ParseResult {
  content: string;
  summary: string;
  tags: string[];
  category: string;
  pageCount: number;
}

class DocumentParser {
  /**
   * 解析文档（模拟，未来接入真实解析库）
   */
  async parse(title: string, type: DocumentType, rawContent: string): Promise<ParseResult> {
    const content = await this.extractText(type, rawContent);
    const tags = this.extractTags(title, content);
    const summary = this.generateSummary(content);
    const category = this.classify(title, content);
    const pageCount = this.estimatePages(content, type);

    return { content, summary, tags, category, pageCount };
  }

  /**
   * 创建文档对象
   */
  async createDocument(
    title: string, type: DocumentType, rawContent: string, rawPath?: string
  ): Promise<KBDocument> {
    const parsed = await this.parse(title, type, rawContent);
    return {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      title, type,
      content: parsed.content,
      rawPath,
      parsedAt: Date.now(),
      tags: parsed.tags,
      category: parsed.category,
      summary: parsed.summary,
      fileSize: rawContent.length,
      pageCount: parsed.pageCount,
    };
  }

  // ===== 文本提取 =====
  private async extractText(type: DocumentType, raw: string): Promise<string> {
    switch (type) {
      case "markdown":
        return this.parseMarkdown(raw);
      case "text":
        return raw;
      case "pdf":
        return this.parsePDF(raw);
      case "word":
        return this.parseWord(raw);
      case "excel":
        return this.parseExcel(raw);
      case "image":
        return this.parseImage(raw);
      default:
        return raw;
    }
  }

  private parseMarkdown(raw: string): string {
    // 去除 MD 标记，保留纯文本
    return raw
      .replace(/^#{1,6}\s+/gm, "")     // 标题
      .replace(/\*\*(.+?)\*\*/g, "$1") // 加粗
      .replace(/\*(.+?)\*/g, "$1")     // 斜体
      .replace(/\[(.+?)\]\(.+?\)/g, "$1") // 链接
      .replace(/```[\s\S]*?```/g, "[代码块]")
      .replace(/`(.+?)`/g, "$1");
  }

  private parsePDF(raw: string): string {
    // 模拟 PDF 解析：清理格式字符
    return raw.replace(/\f/g, "\n--- 分页 ---\n").trim();
  }

  private parseWord(raw: string): string {
    // 模拟 Word 解析
    return raw.replace(/<[^>]+>/g, "").trim();
  }

  private parseExcel(raw: string): string {
    // 模拟 Excel 解析：提取表格数据
    return raw
      .replace(/\t/g, " | ")
      .replace(/\n/g, "\n- ")
      .trim();
  }

  private parseImage(raw: string): string {
    // 模拟图片 OCR（实际需要 OCR 服务）
    return `[图片描述] ${raw.slice(0, 200)}`;
  }

  // ===== 标签提取 =====
  private extractTags(title: string, content: string): string[] {
    const tags = new Set<string>();
    const combined = `${title} ${content.slice(0, 500)}`;

    const patterns: [RegExp, string][] = [
      [/设计|视觉|配色|UI|UX|logo/, "设计"],
      [/代码|开发|API|接口|编程|bug/, "开发"],
      [/调研|分析|市场|竞品|数据/, "调研"],
      [/合同|条款|法律|审核|合规/, "合同"],
      [/品牌|营销|推广|文案|内容/, "品牌"],
      [/产品|手册|目录|清单|规格/, "产品"],
      [/设备|厨房|餐饮|酒店/, "设备"],
      [/安装|施工|工程|调试/, "工程"],
    ];

    for (const [regex, tag] of patterns) {
      if (regex.test(combined)) tags.add(tag);
    }

    return Array.from(tags).slice(0, 5);
  }

  // ===== 分类 =====
  private classify(title: string, content: string): string {
    const combined = `${title} ${content.slice(0, 300)}`;

    if (/合同|条款|法律|协议/.test(combined)) return "合同文件";
    if (/代码|API|接口|技术|架构|开发/.test(combined)) return "技术文档";
    if (/品牌|设计|logo|配色|视觉/.test(combined)) return "品牌素材";
    if (/产品|手册|规格|参数|清单/.test(combined)) return "项目资料";
    return "项目资料";
  }

  // ===== 摘要 =====
  private generateSummary(content: string): string {
    const clean = content.replace(/\s+/g, " ").trim();
    if (clean.length <= 150) return clean;
    return clean.slice(0, 150) + "...";
  }

  // ===== 页数估算 =====
  private estimatePages(content: string, type: DocumentType): number {
    if (type === "image") return 1;
    if (type === "excel") return Math.max(1, Math.ceil(content.split("\n").length / 50));
    // 大约 3000 字符/页
    return Math.max(1, Math.ceil(content.length / 3000));
  }
}

export const documentParser = new DocumentParser();
