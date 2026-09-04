import os
import unittest
from unittest.mock import patch
from pathlib import Path

import personal_server


class PersonalConfigTests(unittest.TestCase):
    def test_local_defaults_are_separate(self):
        with patch.dict(os.environ, {}, clear=True):
            personal_server.configure()
            self.assertEqual(os.environ["BUSINESS_NAME"], "Scott Linger")
            self.assertEqual(os.environ["PERSONAL_WORKSPACE"], "1")
            self.assertEqual(os.environ["PORT"], "8011")
            self.assertEqual(Path(os.environ["APP_DATA_DIR"]).name, "personal_data")
            self.assertNotIn("DATABASE_URL", os.environ)

    def test_railway_must_not_fall_back_to_sqlite(self):
        with patch.dict(os.environ, {"RAILWAY_ENVIRONMENT": "production"}, clear=True):
            with self.assertRaises(RuntimeError):
                personal_server.configure()

    def test_hosting_port_and_database_are_preserved(self):
        with patch.dict(os.environ, {"PORT": "8080", "DATABASE_URL": "postgresql://example/personal"}, clear=True):
            personal_server.configure()
            self.assertEqual(os.environ["PORT"], "8080")
            self.assertEqual(os.environ["DATABASE_URL"], "postgresql://example/personal")
