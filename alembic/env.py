from logging.config import fileConfig
import os

from sqlalchemy import create_engine, pool
from sqlalchemy.engine import Connection

from alembic import context

from app.core.config import settings
from app.db.session import Base

config = context.config
fileConfig(config.config_file_name)


def get_url():
    url = os.environ.get("DATABASE_URL") or settings.database_url
    # Alembic needs a synchronous driver; strip +aiosqlite if present
    return url.replace("+aiosqlite", "")


def run_migrations_offline():
    context.configure(url=get_url(), target_metadata=Base.metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection):
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = create_engine(get_url(), poolclass=pool.NullPool)
    with connectable.connect() as connection:
        do_run_migrations(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
