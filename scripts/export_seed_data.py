#!/usr/bin/env python3
"""
Export all seed data from Snowflake as SQL INSERT statements.
Run this to regenerate sql/03_seed_data.sql from live data.

Usage:
  SNOWFLAKE_CONNECTION_NAME=hcls_demo python3 scripts/export_seed_data.py > sql/03_seed_data.sql
"""
import os
import snowflake.connector

conn = snowflake.connector.connect(
    connection_name=os.getenv("SNOWFLAKE_CONNECTION_NAME", "default")
)

DB = os.getenv("SOURCE_DATABASE", "AGENTIC_DENIED_CLAIMS_HANDLING")
SCHEMA = os.getenv("SOURCE_SCHEMA", "DENIED_CLAIMS")

def escape(val):
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float)):
        return str(val)
    s = str(val).replace("'", "''")
    return f"'{s}'"

def export_table(table_name, columns=None, where_clause=""):
    cur = conn.cursor()
    if columns:
        col_str = ", ".join(columns)
    else:
        cur.execute(f"DESCRIBE TABLE {DB}.{SCHEMA}.{table_name}")
        cols = cur.fetchall()
        columns = [c[0] for c in cols if c[0] != 'CREATED_AT']
        col_str = ", ".join(columns)

    sql = f"SELECT {col_str} FROM {DB}.{SCHEMA}.{table_name}"
    if where_clause:
        sql += f" WHERE {where_clause}"
    sql += f" ORDER BY 1"

    cur.execute(sql)
    rows = cur.fetchall()

    if not rows:
        print(f"-- No data in {table_name}")
        return

    print(f"\n-- {table_name} ({len(rows)} rows)")
    for row in rows:
        vals = ", ".join(escape(v) for v in row)
        print(f"INSERT INTO {table_name} ({col_str}) VALUES ({vals});")

print("-- =============================================================================")
print("-- STEP 3: SEED DATA")
print("-- Auto-generated from live Snowflake data")
print("-- Run AFTER 02_tables.sql")
print("-- =============================================================================")
print()
print("USE ROLE SYSADMIN;")
print("USE DATABASE __APP_DATABASE__;")
print("USE SCHEMA __APP_SCHEMA__;")
print("USE WAREHOUSE __WAREHOUSE__;")

for table in [
    "MEMBERS", "CLAIMS", "CLAIM_LINES", "DENIALS",
    "ELIGIBILITY_BENEFITS", "PRIOR_AUTH", "CONTRACTS", "PAYER_DOCS",
]:
    export_table(table)

print("\n-- =============================================================================")
print("-- SEED STATE TABLES (for demo reset)")
print("-- =============================================================================")

for table in [
    "SEED_DENIALS", "SEED_DENIALS_AGENT_STATE",
    "SEED_DENIAL_WORK_ITEMS", "SEED_WORK_ITEMS",
    "SEED_DENIAL_NOTES", "SEED_NOTES",
    "SEED_APPEAL_DRAFTS",
]:
    export_table(table)

print("\n-- Verification")
print("SELECT 'MEMBERS' AS TBL, COUNT(*) AS CNT FROM MEMBERS")
print("UNION ALL SELECT 'CLAIMS', COUNT(*) FROM CLAIMS")
print("UNION ALL SELECT 'DENIALS', COUNT(*) FROM DENIALS")
print("UNION ALL SELECT 'PAYER_DOCS', COUNT(*) FROM PAYER_DOCS;")

conn.close()
