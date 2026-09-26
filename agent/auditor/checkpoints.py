from psycopg.conninfo import make_conninfo
from langgraph.checkpoint.postgres import PostgresSaver


def checkpoint_saver(database_url):
    # Keep source-bearing model state outside Supabase's exposed public schema.
    return PostgresSaver.from_conn_string(
        make_conninfo(database_url, options="-c search_path=audit_private"))
