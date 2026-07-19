"""Databricks SQL client via the Statement Execution API.

Reads/writes are governed by Unity Catalog and (in the app) stamped with the
service-principal identity. Mirrors the Valterra OM Portal db layer.
"""
import os
from typing import Any, List, Dict, Optional
from databricks.sdk.service.sql import (
    StatementState,
    StatementResponse,
    StatementParameterListItem,
)

from .config import get_workspace_client, CATALOG

WAREHOUSE_ID = os.environ.get("FRAUD_WAREHOUSE_ID", "d0305022e6c3db8e")  # elexon-anamoly-app


def _to_params(parameters: Optional[List[Dict]]):
    """Convert {name, value} dicts to typed StatementParameterListItem."""
    if not parameters:
        return None
    return [
        StatementParameterListItem(name=p["name"], value=p.get("value"))
        for p in parameters
    ]


def _execute(sql: str, parameters: Optional[List[Dict]] = None) -> StatementResponse:
    client = get_workspace_client()
    return client.statement_execution.execute_statement(
        statement=sql,
        warehouse_id=WAREHOUSE_ID,
        parameters=_to_params(parameters),
        wait_timeout="30s",
        catalog=CATALOG,
    )


def fetch_all(sql: str, parameters: Optional[List[Dict]] = None) -> List[Dict[str, Any]]:
    resp = _execute(sql, parameters)
    if resp.status.state != StatementState.SUCCEEDED:
        raise RuntimeError(f"SQL failed: {resp.status.error}")
    if not resp.result or not resp.result.data_array:
        return []
    cols = [c.name for c in resp.manifest.schema.columns]
    return [dict(zip(cols, row)) for row in resp.result.data_array]


def execute(sql: str, parameters: Optional[List[Dict]] = None) -> None:
    resp = _execute(sql, parameters)
    if resp.status.state != StatementState.SUCCEEDED:
        raise RuntimeError(f"SQL failed: {resp.status.error}")
