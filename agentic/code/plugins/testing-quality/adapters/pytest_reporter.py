"""Explicitly invoked pytest hook adapter; importing this file does not run tests.

Collection imports target modules and hooks, as pytest normally does. Execution
supports the local serial pytest protocol; xdist worker aggregation is not
qualified. Select the target interpreter explicitly; no packages are installed.
"""
import argparse
import json
import os
from pathlib import Path
import sys


class CanonicalReporter:
    def __init__(self, mode, root):
        self.mode = mode
        self.root = root
        self.selected = {}
        self.results = {}
        self.errors = []

    def pytest_collection_finish(self, session):
        for item in session.items:
            self.selected[item.nodeid] = {
                "file": os.path.relpath(str(item.path), self.root).replace(os.sep, "/"),
                "name": item.nodeid,
                "status": "unknown",
            }

    def pytest_collectreport(self, report):
        if report.failed:
            self.errors.append({"code": "COLLECTION_FAILURE", "message": str(report.longrepr)})

    def pytest_internalerror(self, excrepr, excinfo):
        self.errors.append({"code": "PYTEST_INTERNAL_ERROR", "message": str(excrepr)})

    def pytest_runtest_logreport(self, report):
        case = self.results.setdefault(report.nodeid, {
            "file": report.nodeid.split("::", 1)[0], "name": report.nodeid,
            "status": "unknown", "durationMs": 0, "phases": [],
        })
        case["durationMs"] += report.duration * 1000
        case["phases"].append(report.when)
        if report.failed:
            case["status"] = "failed"
        elif case["status"] != "failed":
            if report.skipped:
                case["status"] = "skipped"
            elif report.when == "call":
                case["status"] = "passed"

    def document(self, exitcode, pytest_version):
        if self.mode == "discovery":
            cases = list(self.selected.values())
        else:
            cases = []
            for nodeid, selected in self.selected.items():
                result = self.results.get(nodeid)
                if result is None or "teardown" not in result["phases"]:
                    self.errors.append({"code": "INCOMPLETE_TEST", "message": nodeid})
                case = dict(result or selected)
                case.pop("phases", None)
                cases.append(case)
            for nodeid in self.results.keys() - self.selected.keys():
                self.errors.append({"code": "UNREGISTERED_RESULT", "message": nodeid})
        if exitcode not in (0, 1):
            self.errors.append({"code": "PYTEST_INCOMPLETE", "message": "pytest exit " + str(exitcode)})
        files = {}
        rank = {"failed": 4, "unknown": 3, "passed": 2, "skipped": 1}
        for case in cases:
            previous = files.get(case["file"], "skipped")
            files[case["file"]] = max((previous, case["status"]), key=lambda status: rank[status])
        return {"mode": self.mode, "complete": not self.errors, "cases": cases,
                "files": [{"path": file, "status": status} for file, status in files.items()],
                "errors": self.errors, "runner": {"name": "pytest", "version": pytest_version,
                "python": sys.version, "exitCode": exitcode, "adapter": "aiwg-pytest-hooks-v1"}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("discovery", "execution"), required=True)
    parser.add_argument("--output", required=True)
    args, pytest_args = parser.parse_known_args()
    if pytest_args[:1] == ["--"]:
        pytest_args = pytest_args[1:]
    output = Path(args.output)
    if output.exists():
        parser.error("refusing to overwrite existing report")
    import pytest
    reporter = CanonicalReporter(args.mode, os.getcwd())
    if args.mode == "discovery":
        pytest_args = ["--collect-only"] + pytest_args
    exitcode = int(pytest.main(pytest_args, plugins=[reporter]))
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as stream:
        json.dump(reporter.document(exitcode, pytest.__version__), stream, indent=2)
        stream.write("\n")
    return exitcode


if __name__ == "__main__":
    raise SystemExit(main())
