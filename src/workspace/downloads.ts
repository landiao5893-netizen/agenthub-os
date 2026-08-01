import { strToU8, zipSync } from "fflate";
import { SharedWorkspace, WorkspaceArtifact, WorkspaceEntry } from "@/workspace/types";

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 90) || "artifact";
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function entryMarkdown(entry: WorkspaceEntry) {
  return [
    "# " + entry.title,
    "",
    "- Agent: " + entry.agentName,
    "- Status: " + entry.status,
    "- Time: " + new Date(entry.createdAt).toLocaleString("zh-CN"),
    "",
    entry.content,
    "",
  ].join("\n");
}

export function downloadEntryMarkdown(entry: WorkspaceEntry) {
  saveBlob(
    new Blob([entryMarkdown(entry)], { type: "text/markdown;charset=utf-8" }),
    safeFileName(entry.title) + ".md",
  );
}

export function downloadArtifact(artifact: WorkspaceArtifact) {
  const anchor = document.createElement("a");
  anchor.href = artifact.url + (artifact.url.includes("?") ? "&" : "?") + "download=1";
  anchor.download = safeFileName(artifact.name);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function downloadWorkspaceBundle(workspace: SharedWorkspace) {
  const files: Record<string, Uint8Array> = {};
  const usedNames = new Set<string>();

  const uniqueName = (candidate: string) => {
    let name = candidate;
    let index = 2;
    while (usedNames.has(name)) {
      const dot = candidate.lastIndexOf(".");
      name = dot > 0
        ? candidate.slice(0, dot) + "-" + index + candidate.slice(dot)
        : candidate + "-" + index;
      index += 1;
    }
    usedNames.add(name);
    return name;
  };

  workspace.entries.forEach((entry, index) => {
    const name = uniqueName(String(index + 1).padStart(2, "0") + "-" + safeFileName(entry.title) + ".md");
    files[name] = strToU8(entryMarkdown(entry));
  });

  for (const entry of workspace.entries) {
    for (const artifact of entry.artifacts ?? []) {
      try {
        const response = await fetch(artifact.url);
        if (!response.ok) continue;
        const bytes = new Uint8Array(await response.arrayBuffer());
        files["attachments/" + uniqueName(safeFileName(artifact.name))] = bytes;
      } catch {
        // A failed attachment does not block downloading the remaining deliverables.
      }
    }
  }

  const zip = zipSync(files, { level: 6 });
  saveBlob(new Blob([zip], { type: "application/zip" }), safeFileName(workspace.projectName) + "-交付包.zip");
}