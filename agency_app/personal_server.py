"""Scott Linger's instance: shared features, separate configuration and storage."""
import os
from pathlib import Path


def configure():
    if os.environ.get("RAILWAY_ENVIRONMENT") and not os.environ.get("DATABASE_URL", "").strip():
        raise RuntimeError("The personal Railway service requires its OWN PostgreSQL DATABASE_URL.")
    defaults = {
        "BUSINESS_NAME": "Scott Linger",
        "APP_NAME": "Scott Linger - TutorFlow",
        "WORKSPACE_NAME": "Scott Linger",
        "EMAIL_SENDER_NAME": "Scott Linger - TutorFlow",
        "POSTMARK_FROM_EMAIL": "contact@scottlinger.co.uk",
        "APP_DATA_DIR": str(Path(__file__).resolve().parent / "personal_data"),
        "PORT": "8011",
    }
    for name, value in defaults.items():
        os.environ.setdefault(name, value)
    os.environ["PERSONAL_WORKSPACE"] = "1"


if __name__ == "__main__":
    configure()
    import server
    server.main()
