import pandas as pd

from ml.src.data.database import (
    is_truthy,
    load_database_tables,
    parse_npgsql_connection_string,
)


def test_parse_npgsql_connection_string_maps_expected_psycopg_fields() -> None:
    parsed = parse_npgsql_connection_string(
        "Host=db.example.supabase.co;Port=5432;Database=postgres;"
        "Username=postgres;Password=secret;SSL Mode=Require"
    )

    assert parsed == {
        "host": "db.example.supabase.co",
        "port": 5432,
        "dbname": "postgres",
        "user": "postgres",
        "password": "secret",
        "sslmode": "require",
    }


def test_is_truthy_accepts_common_true_values() -> None:
    assert is_truthy("true")
    assert is_truthy("YES")
    assert is_truthy("1")
    assert not is_truthy("false")
    assert not is_truthy(None)


def test_load_database_tables_reuses_single_autocommit_connection(monkeypatch) -> None:
    executed_queries: list[str] = []

    class FakeCursor:
        description = [type("Column", (), {"name": "id"})()]

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb) -> None:
            return None

        def execute(self, query: str) -> None:
            executed_queries.append(query)

        def fetchall(self):
            return [(1,)]

    class FakeConnection:
        def __init__(self) -> None:
            self.autocommit = True
            self.closed = False

        def cursor(self):
            return FakeCursor()

        def close(self) -> None:
            self.closed = True

    fake_connection = FakeConnection()
    connection_calls: list[bool] = []

    def fake_connect(connection_string=None, *, autocommit=False):
        connection_calls.append(autocommit)
        return fake_connection

    monkeypatch.setattr("ml.src.data.database.connect_to_postgres", fake_connect)

    tables = load_database_tables(["supporters", "donations"])

    assert connection_calls == [True]
    assert fake_connection.closed
    assert list(tables) == ["supporters", "donations"]
    assert all(isinstance(df, pd.DataFrame) for df in tables.values())
    assert executed_queries == [
        'SELECT * FROM public."supporters"',
        'SELECT * FROM public."donations"',
    ]
