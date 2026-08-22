#!/usr/bin/env python3
"""Detect native extensions before using mutmut covered-line selection.

The selected tests run in a subprocess with a small pytest plugin that records
newly imported native modules.  A dependency-free import-file mode exists for
fixtures and projects that need to inspect import-time behavior before pytest is
available.  The parent process never unloads or re-imports a discovered module.
"""

from __future__ import annotations

import argparse
import importlib
import importlib.machinery
import json
import os
import runpy
import subprocess
import sys
import tempfile
import time
import traceback
from pathlib import Path
from typing import Any, Sequence


RESULT_PREFIX = "AIWG_NATIVE_PREFLIGHT_RESULT="
NATIVE_RELOAD_SIGNATURES = (
    "module functions cannot set METH_CLASS or METH_STATIC",
    "cannot load module more than once per process",
    "failed to collect stats",
    "Fatal Python error: Segmentation fault",
)


def _native_extensions_since(baseline: set[str]) -> list[dict[str, str]]:
    suffixes = tuple(importlib.machinery.EXTENSION_SUFFIXES)
    extensions: list[dict[str, str]] = []
    for name, module in sorted(sys.modules.items()):
        if name in baseline or module is None:
            continue
        spec = getattr(module, "__spec__", None)
        origin = getattr(spec, "origin", None) or getattr(module, "__file__", None)
        loader = getattr(spec, "loader", None)
        if not isinstance(origin, str):
            continue
        if isinstance(loader, importlib.machinery.ExtensionFileLoader) or origin.endswith(suffixes):
            extensions.append({"module": name, "origin": str(Path(origin).resolve())})
    return extensions


def _internal_import_probe(files: Sequence[str], modules: Sequence[str]) -> int:
    baseline = set(sys.modules)
    error: dict[str, str] | None = None
    try:
        for file_name in files:
            runpy.run_path(file_name, run_name=f"__aiwg_preflight_{Path(file_name).stem}__")
        for module_name in modules:
            importlib.import_module(module_name)
    except BaseException as exc:  # the parent classifies import failures as project failures
        error = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": "".join(traceback.format_exception(exc)),
        }
    report = {
        "probe": "isolated-import",
        "error": error,
        "native_extensions": _native_extensions_since(baseline),
    }
    print(f"{RESULT_PREFIX}{json.dumps(report, sort_keys=True)}")
    return 0 if error is None else 3


def _parse_prefixed_report(stdout: str) -> dict[str, Any] | None:
    for line in reversed(stdout.splitlines()):
        if line.startswith(RESULT_PREFIX):
            return json.loads(line[len(RESULT_PREFIX):])
    return None


def _run_import_probe(args: argparse.Namespace) -> dict[str, Any]:
    command = [sys.executable, str(Path(__file__).resolve()), "--internal-import-probe"]
    for file_name in args.import_file:
        command.extend(["--import-file", file_name])
    for module_name in args.import_module:
        command.extend(["--import-module", module_name])
    started = time.monotonic()
    try:
        process = subprocess.run(
            command,
            cwd=args.project_root,
            capture_output=True,
            text=True,
            timeout=args.timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        return {
            "probe": "isolated-import",
            "duration_seconds": round(time.monotonic() - started, 3),
            "timed_out": True,
            "error": {"type": "TimeoutExpired", "message": str(exc)},
            "native_extensions": [],
        }
    report = _parse_prefixed_report(process.stdout) or {
        "probe": "isolated-import",
        "error": {
            "type": "MissingProbeReport",
            "message": process.stderr.strip() or "import probe produced no report",
        },
        "native_extensions": [],
    }
    report.update(
        {
            "duration_seconds": round(time.monotonic() - started, 3),
            "exit_code": process.returncode,
            "timed_out": False,
        }
    )
    return report


def _run_pytest_probe(args: argparse.Namespace) -> dict[str, Any]:
    report_handle = tempfile.NamedTemporaryFile(prefix="aiwg-native-preflight-", suffix=".json", delete=False)
    report_path = Path(report_handle.name)
    report_handle.close()
    report_path.unlink(missing_ok=True)

    environment = os.environ.copy()
    script_directory = str(Path(__file__).resolve().parent)
    current_python_path = environment.get("PYTHONPATH")
    environment["PYTHONPATH"] = (
        script_directory if not current_python_path else f"{script_directory}{os.pathsep}{current_python_path}"
    )
    environment["AIWG_MUTATION_NATIVE_REPORT"] = str(report_path)
    command = [
        sys.executable,
        "-m",
        "pytest",
        "-p",
        "aiwg_mutation_native_probe",
        *args.test_selection,
        *args.pytest_arg,
    ]
    started = time.monotonic()
    try:
        process = subprocess.run(
            command,
            cwd=args.project_root,
            capture_output=True,
            text=True,
            timeout=args.timeout_seconds,
            env=environment,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        report_path.unlink(missing_ok=True)
        return {
            "probe": "subprocess-isolated-pytest",
            "duration_seconds": round(time.monotonic() - started, 3),
            "timed_out": True,
            "error": {"type": "TimeoutExpired", "message": str(exc)},
            "native_extensions": [],
        }

    report: dict[str, Any]
    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        report = {
            "error": {
                "type": type(exc).__name__,
                "message": process.stderr.strip() or str(exc),
            },
            "native_extensions": [],
        }
    finally:
        report_path.unlink(missing_ok=True)
    report.update(
        {
            "probe": "subprocess-isolated-pytest",
            "duration_seconds": round(time.monotonic() - started, 3),
            "exit_code": process.returncode,
            "timed_out": False,
        }
    )
    if process.returncode != 0 and "error" not in report:
        report["error"] = {
            "type": "PytestFailure",
            "message": (process.stderr or process.stdout).strip()[-4000:],
        }
    return report


def _deduplicate_extensions(probes: Sequence[dict[str, Any]]) -> list[dict[str, str]]:
    unique: dict[tuple[str, str], dict[str, str]] = {}
    for probe in probes:
        for extension in probe.get("native_extensions", []):
            key = (extension["module"], extension["origin"])
            unique[key] = extension
    return [unique[key] for key in sorted(unique)]


def _fallback(args: argparse.Namespace, baseline_seconds: float, required: bool) -> dict[str, Any]:
    missing: list[str] = []
    if required and baseline_seconds <= 0:
        missing.append("successful baseline probe")
    if not args.mutation_target:
        missing.append("--mutation-target")
    if args.estimated_mutants is None:
        missing.append("--estimated-mutants")
    if args.runtime_budget_seconds is None:
        missing.append("--runtime-budget-seconds")
    if args.max_children is None:
        missing.append("--max-children")

    estimate: float | None = None
    within_budget = False
    if not missing:
        estimate = round(
            baseline_seconds * args.estimated_mutants / args.max_children * args.safety_factor,
            3,
        )
        within_budget = estimate <= args.runtime_budget_seconds

    return {
        "required": required,
        "mode": "mutmut-without-covered-line-filter",
        "allowed": required and not missing and within_budget,
        "missing_bounds": missing,
        "mutation_targets": args.mutation_target,
        "mutate_only_covered_lines": False,
        "estimated_mutants": args.estimated_mutants,
        "max_children": args.max_children,
        "baseline_test_seconds": round(baseline_seconds, 3),
        "safety_factor": args.safety_factor,
        "estimated_runtime_seconds": estimate,
        "runtime_budget_seconds": args.runtime_budget_seconds,
        "within_budget": within_budget,
    }


def _classify_log(path: str | None) -> dict[str, Any] | None:
    if not path:
        return None
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    matches = [signature for signature in NATIVE_RELOAD_SIGNATURES if signature in text]
    reinitialization_error = any(signature in text for signature in NATIVE_RELOAD_SIGNATURES[:2])
    native_segfault = "Fatal Python error: Segmentation fault" in text and "Extension modules:" in text
    native_reload = "Running stats" in text and (reinitialization_error or native_segfault)
    return {
        "path": path,
        "classification": (
            "harness_tool_failure_native_extension_reload"
            if native_reload
            else "unclassified_mutmut_output"
        ),
        "matched_signatures": matches,
        "counts_as_mutant_outcome": False if native_reload else None,
    }


def _build_result(args: argparse.Namespace) -> tuple[dict[str, Any], int]:
    probes: list[dict[str, Any]] = []
    if args.import_file or args.import_module:
        probes.append(_run_import_probe(args))
    if args.test_selection:
        probes.append(_run_pytest_probe(args))

    extensions = _deduplicate_extensions(probes)
    timed_out = any(probe.get("timed_out") for probe in probes)
    probe_errors = [probe["error"] for probe in probes if probe.get("error")]
    mutmut_log = _classify_log(args.classify_mutmut_log)
    known_reload_failure = bool(
        mutmut_log and mutmut_log["classification"] == "harness_tool_failure_native_extension_reload"
    )

    if timed_out:
        classification, status, exit_code = "harness_preflight_timeout", "blocked", 4
    elif probe_errors:
        classification, status, exit_code = "project_test_or_import_failure", "blocked", 3
    elif extensions or known_reload_failure:
        classification = (
            "harness_tool_failure_native_extension_reload"
            if known_reload_failure
            else "harness_native_extension_reload_risk"
        )
        status, exit_code = "blocked", 2
    else:
        classification, status, exit_code = "preflight_safe", "safe", 0

    baseline_seconds = sum(float(probe.get("duration_seconds", 0.0)) for probe in probes)
    fallback_required = classification in {
        "harness_native_extension_reload_risk",
        "harness_tool_failure_native_extension_reload",
    }
    fallback = _fallback(args, baseline_seconds, required=fallback_required)
    result = {
        "schema_version": "1",
        "status": status,
        "classification": classification,
        "execution_mode": "subprocess-isolated-native-extension-preflight",
        "mutate_only_covered_lines_safe": status == "safe",
        "native_extensions": extensions,
        "probes": probes,
        "fallback": fallback,
        "mutmut_log": mutmut_log,
        "evidence": {
            "harness_or_tool_failure": classification.startswith("harness_"),
            "project_test_failure": classification == "project_test_or_import_failure",
            "mutant_outcomes_recorded": False,
        },
    }
    return result, exit_code


def _positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed


def _positive_float(value: str) -> float:
    parsed = float(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--test-selection", action="append", default=[], help="pytest path or node selection")
    parser.add_argument("--pytest-arg", action="append", default=[], help="additional pytest argument")
    parser.add_argument("--import-file", action="append", default=[], help="file to import in an isolated process")
    parser.add_argument("--import-module", action="append", default=[], help="module to import in an isolated process")
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--timeout-seconds", type=_positive_float, default=300.0)
    parser.add_argument("--mutation-target", action="append", default=[], help="explicit only_mutate target")
    parser.add_argument("--estimated-mutants", type=_positive_int)
    parser.add_argument("--runtime-budget-seconds", type=_positive_float)
    parser.add_argument("--max-children", type=_positive_int)
    parser.add_argument("--safety-factor", type=_positive_float, default=1.5)
    parser.add_argument("--classify-mutmut-log")
    parser.add_argument("--format", choices=("json", "text"), default="text")
    parser.add_argument("--internal-import-probe", action="store_true", help=argparse.SUPPRESS)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.internal_import_probe:
        return _internal_import_probe(args.import_file, args.import_module)
    if not (args.test_selection or args.import_file or args.import_module or args.classify_mutmut_log):
        _parser().error("provide --test-selection, --import-file, --import-module, or --classify-mutmut-log")

    result, exit_code = _build_result(args)
    if args.format == "json":
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        print(f"Mutation preflight: {result['status']} ({result['classification']})")
        for extension in result["native_extensions"]:
            print(f"- {extension['module']}: {extension['origin']}")
        fallback = result["fallback"]
        if fallback["required"] and not fallback["allowed"]:
            print("Covered-line mutation is blocked; provide explicit targets, mutant estimate, children, and budget.")
        elif fallback["allowed"]:
            print(
                "Bounded fallback allowed: mutate_only_covered_lines=false; "
                f"estimate {fallback['estimated_runtime_seconds']}s / budget {fallback['runtime_budget_seconds']}s"
            )
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
