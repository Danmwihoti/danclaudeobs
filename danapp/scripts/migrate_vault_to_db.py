import os
from pathlib import Path

try:
    import psycopg
except ImportError:  # pragma: no cover
    psycopg = None


DOCUMENTS = {
    "daily_tracker": Path("Templates") / "Daily Tracker.md",
    "weekly_tracker": Path("Templates") / "Weekly Tracker.md",
    "ai_history": Path("AI Conversations.md"),
    "inbox_notes": Path("Inbox.md"),
    "claude_answers": Path("Claude Answers.md"),
}


def main() -> int:
    if psycopg is None:
        raise RuntimeError("psycopg is not installed")

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")

    vault_root = Path(os.environ.get("VAULT_PATH", Path(__file__).resolve().parents[2]))

    migrated = []
    skipped = []

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS app_documents (
                  key TEXT PRIMARY KEY,
                  content TEXT NOT NULL DEFAULT '',
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )

            for key, relative_path in DOCUMENTS.items():
                file_path = vault_root / relative_path
                if not file_path.exists():
                    skipped.append((key, str(file_path)))
                    continue

                content = file_path.read_text(encoding="utf-8")
                cur.execute(
                    """
                    INSERT INTO app_documents (key, content, updated_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (key)
                    DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
                    """,
                    (key, content),
                )
                migrated.append((key, len(content)))

        conn.commit()

    print("Migrated documents:")
    for key, size in migrated:
        print(f"- {key}: {size} chars")

    if skipped:
        print("Skipped missing files:")
        for key, file_path in skipped:
            print(f"- {key}: {file_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
