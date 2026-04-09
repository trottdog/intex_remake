from ml.src.data.database import is_truthy, parse_npgsql_connection_string


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
