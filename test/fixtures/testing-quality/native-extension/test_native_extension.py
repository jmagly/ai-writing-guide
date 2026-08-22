"""Minimal native-extension import used by the mutation preflight regression."""

import _sqlite3


def test_native_extension_is_available() -> None:
    assert _sqlite3.sqlite_version
