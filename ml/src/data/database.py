"""Database helpers for loading ML source tables from Supabase/Postgres."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd

from ml.src.config.paths import REPO_ROOT
from ml.src.data.schemas import EXPECTED_TABLES

ENV_FILE_CANDIDATES = (
    REPO_ROOT / ".env",
    REPO_ROOT / "ml" / ".env",
    REPO_ROOT / "backend" / "intex" / "intex" / ".env",
)
DATABASE_ENV_KEYS = (
    "SUPABASE_DB_CONNECTION_STRING",
    "ML_DATABASE_URL",
    "ConnectionStrings__DefaultConnection",
)


def _load_env_file(path: Path) -> None:
    """Populate missing environment variables from a simple .env file."""

    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def load_local_env_files() -> None:
    """Load the repo's common .env files if they exist."""

    for path in ENV_FILE_CANDIDATES:
        _load_env_file(path)


def is_truthy(value: str | None) -> bool:
    """Interpret a string environment variable as a boolean."""

    return (value or "").strip().lower() in {"1", "true", "yes", "y", "on"}


def should_use_database_source() -> bool:
    """Return whether raw tables should be loaded from Postgres."""

    return is_truthy(os.environ.get("ML_USE_SUPABASE"))


def resolve_database_connection_string(connection_string: str | None = None) -> str:
    """Resolve the database connection string from env or an explicit value."""

    if connection_string and connection_string.strip():
        return connection_string.strip()

    load_local_env_files()
    for key in DATABASE_ENV_KEYS:
        value = os.environ.get(key)
        if value and value.strip():
            return value.strip()

    keys = ", ".join(DATABASE_ENV_KEYS)
    raise RuntimeError(
        "No ML database connection string is configured. "
        f"Set one of: {keys}"
    )


def parse_npgsql_connection_string(connection_string: str) -> dict[str, object]:
    """Convert an Npgsql-style semicolon connection string into psycopg kwargs."""

    parts: dict[str, str] = {}
    for segment in connection_string.split(";"):
        piece = segment.strip()
        if not piece or "=" not in piece:
            continue
        key, value = piece.split("=", 1)
        parts[key.strip().lower()] = value.strip()

    def first_value(*keys: str) -> str | None:
        for key in keys:
            value = parts.get(key)
            if value:
                return value
        return None

    port_value = first_value("port")
    parsed: dict[str, object] = {
        "host": first_value("host", "server"),
        "port": int(port_value) if port_value else 5432,
        "dbname": first_value("database", "initial catalog"),
        "user": first_value("username", "user id", "userid", "user"),
        "password": first_value("password", "pwd"),
    }

    ssl_mode = first_value("ssl mode", "sslmode")
    if ssl_mode:
        parsed["sslmode"] = ssl_mode.lower()

    return {key: value for key, value in parsed.items() if value not in {None, ""}}


def describe_database_target(connection_string: str | None = None) -> str:
    """Return a concise description of the configured database target."""

    resolved = resolve_database_connection_string(connection_string)
    if "://" in resolved:
        parsed = urlparse(resolved)
        database_name = parsed.path.lstrip("/") or "postgres"
        return f"{parsed.hostname}:{parsed.port or 5432}/{database_name}"

    parsed = parse_npgsql_connection_string(resolved)
    host = parsed.get("host", "unknown-host")
    port = parsed.get("port", 5432)
    database_name = parsed.get("dbname", "postgres")
    return f"{host}:{port}/{database_name}"


def is_transaction_pooler_connection(connection_string: str | None = None) -> bool:
    """Return whether the configured database points at the Supabase pooler port."""

    resolved = resolve_database_connection_string(connection_string)
    if "://" in resolved:
        parsed = urlparse(resolved)
        return (parsed.port or 5432) == 6543

    parsed = parse_npgsql_connection_string(resolved)
    return int(parsed.get("port", 5432)) == 6543


def connect_to_postgres(
    connection_string: str | None = None,
    *,
    autocommit: bool = False,
):
    """Create a psycopg connection for the configured Postgres target."""

    import psycopg

    resolved = resolve_database_connection_string(connection_string)
    if "://" in resolved:
        return psycopg.connect(resolved, autocommit=autocommit)

    return psycopg.connect(
        **parse_npgsql_connection_string(resolved),
        autocommit=autocommit,
    )


def _read_table_from_connection(
    conn,
    table_name: str,
) -> pd.DataFrame:
    """Execute a single raw-table select using an existing connection."""

    query = f'SELECT * FROM public."{table_name}"'
    with conn.cursor() as cursor:
        cursor.execute(query)
        rows = cursor.fetchall()
        columns = [column.name for column in cursor.description]

    return pd.DataFrame(rows, columns=columns)


def load_database_table(
    table_name: str,
    *,
    connection_string: str | None = None,
) -> pd.DataFrame:
    """Load a source table from Postgres into a dataframe."""

    if table_name not in EXPECTED_TABLES:
        valid = ", ".join(EXPECTED_TABLES)
        raise ValueError(f"Unknown raw table '{table_name}'. Valid options: {valid}")

    conn = connect_to_postgres(connection_string, autocommit=True)
    try:
        return _read_table_from_connection(conn, table_name)
    finally:
        conn.close()


def load_database_tables(
    table_names: tuple[str, ...] | list[str] | None = None,
    *,
    connection_string: str | None = None,
) -> dict[str, pd.DataFrame]:
    """Load multiple source tables from Postgres."""

    selected = tuple(table_names or EXPECTED_TABLES)
    invalid = [table_name for table_name in selected if table_name not in EXPECTED_TABLES]
    if invalid:
        valid = ", ".join(EXPECTED_TABLES)
        invalid_names = ", ".join(invalid)
        raise ValueError(f"Unknown raw table(s) '{invalid_names}'. Valid options: {valid}")

    conn = connect_to_postgres(connection_string, autocommit=True)
    try:
        return {
            table_name: _read_table_from_connection(conn, table_name)
            for table_name in selected
        }
    finally:
        conn.close()
