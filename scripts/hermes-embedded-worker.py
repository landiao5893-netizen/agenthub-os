"""AgentHub-owned bridge for the embedded Hermes Agent runtime."""

from __future__ import annotations

import contextlib
import json
import os
import sys
import traceback
from pathlib import Path


def _emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main() -> int:
    request = json.load(sys.stdin)
    runtime_home = Path(os.environ["HERMES_RUNTIME_HOME"]).resolve()
    sys.path.insert(0, str(runtime_home))

    events: list[dict] = []

    def tool_progress(event: object) -> None:
        if isinstance(event, dict):
            events.append(event)
        else:
            events.append({"event": "tool.progress", "detail": str(event)})

    provider = request.get("provider") or os.environ.get("AGENTHUB_MODEL_PROVIDER", "opencode-go")
    model = request.get("model") or os.environ.get("AGENTHUB_MODEL_NAME", "deepseek-v4-flash")
    run_mode = request.get("run_mode", "runtime")
    max_iterations = 6 if run_mode == "planning" else 30
    instructions = request.get("instructions") or ""
    artifact_output = request.get("artifact_output_path")

    if artifact_output:
        artifact_path = Path(artifact_output).resolve()
        artifact_root = Path(request.get("artifact_root_path") or (Path.cwd() / ".data" / "artifacts")).resolve()
        if not artifact_path.is_relative_to(artifact_root):
            _emit({"ok": False, "error": "Artifact path is outside AgentHub workspace"})
            return 1
        artifact_path.parent.mkdir(parents=True, exist_ok=True)
        instructions += (
            "\nUse the available image-generation tool to create one PNG image. "
            f"Save the final image exactly to: {artifact_path}. "
            "Do not return before the file exists."
        )

    try:
        with contextlib.redirect_stdout(sys.stderr):
            from run_agent import AIAgent

            agent = AIAgent(
                base_url=request.get("apiUrl"),
                api_key=request.get("apiToken"),
                provider=provider,
                model=model,
                max_iterations=max_iterations,
                enabled_toolsets=request.get("enabled_toolsets"),
                ephemeral_system_prompt=instructions,
                session_id=request.get("session_id") or request.get("session_source"),
                platform="agenthub-os",
                user_id="agenthub-os",
                quiet_mode=True,
                skip_context_files=True,
                load_soul_identity=False,
                skip_memory=True,
                tool_progress_callback=tool_progress,
            )
            result = agent.run_conversation(request["input"])

        output = result.get("final_response", "") if isinstance(result, dict) else str(result)
        if isinstance(result, dict) and result.get("failed"):
            _emit({"ok": False, "error": str(result.get("error") or "Intelligence run failed"), "events": events})
            return 1
        if artifact_output and not Path(artifact_output).is_file():
            _emit({"ok": False, "error": "Image tool did not create the requested artifact", "events": events})
            return 1

        _emit({
            "ok": True,
            "output": output,
            "result": {"text": output},
            "session_id": getattr(agent, "session_id", None),
            "runtime_version": "0.19.0",
            "events": events,
        })
        return 0
    except Exception as error:
        traceback.print_exc(file=sys.stderr)
        _emit({"ok": False, "error": str(error), "runtime_version": "0.19.0", "events": events})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
