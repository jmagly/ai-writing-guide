"""Pytest plugin used by native_extension_preflight.py.

The plugin records native modules imported after pytest loads this plugin.  It
runs inside the disposable pytest subprocess; no module is unloaded or reloaded.
"""

from __future__ import annotations

import atexit
import importlib.machinery
import json
import os
import sys
from pathlib import Path


_BASELINE_MODULES = frozenset(sys.modules)
_EXIT_STATUS: int | None = None
_WRITTEN = False


def _native_extensions() -> list[dict[str, str]]:
    suffixes = tuple(importlib.machinery.EXTENSION_SUFFIXES)
    extensions: list[dict[str, str]] = []
    for name, module in sorted(sys.modules.items()):
        if name in _BASELINE_MODULES or module is None:
            continue
        spec = getattr(module, "__spec__", None)
        origin = getattr(spec, "origin", None) or getattr(module, "__file__", None)
        loader = getattr(spec, "loader", None)
        if not isinstance(origin, str):
            continue
        if isinstance(loader, importlib.machinery.ExtensionFileLoader) or origin.endswith(suffixes):
            extensions.append({"module": name, "origin": str(Path(origin).resolve())})
    return extensions


def _write_report() -> None:
    global _WRITTEN
    if _WRITTEN:
        return
    destination = os.environ.get("AIWG_MUTATION_NATIVE_REPORT")
    if not destination:
        return
    Path(destination).write_text(
        json.dumps(
            {
                "exit_status": _EXIT_STATUS,
                "native_extensions": _native_extensions(),
            },
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    _WRITTEN = True


def pytest_sessionfinish(session: object, exitstatus: int) -> None:
    """Capture the import delta before the isolated pytest process exits."""

    del session
    global _EXIT_STATUS
    _EXIT_STATUS = int(exitstatus)
    _write_report()


atexit.register(_write_report)
