#!/usr/bin/env python3
"""
Investec Sentinel — near-real-time file-drop generator.

Writes a JSON file of new ledger transactions into the Auto Loader landing volume:

  /Volumes/elexon_app_for_settlement_acc_catalog/investec_fraud_aml_bronze/landing/transactions/

The streaming bronze table (transactions_stream) picks the file up incrementally;
silver.transactions unions it with the historical batch feed; and the existing
detectors fire — so a dropped file surfaces a fresh alert in gold.fraud_alerts
(and the app) within seconds of the next pipeline update.

Two modes:
  --scenario layering   (default) a planted layering / passthrough ring on one
                        account: a large inflow immediately followed by a
                        near-equal outflow within 24h -> trips `rapid_movement`.
  --scenario normal     benign transactions only (noise; no alert expected).

Usage (uses the databricks CLI to upload; requires an authenticated profile):
  python drop_transactions.py --profile fevm-elexon-app-for-settlement-acc
  python drop_transactions.py --scenario normal --count 20 --account ACC00000021

The file is named with a high-resolution timestamp so every drop is a distinct
new file (Auto Loader ingests each once).
"""
import argparse
import json
import os
import subprocess
import tempfile
import time
from datetime import datetime, timedelta, timezone

VOLUME_DIR = (
    "/Volumes/elexon_app_for_settlement_acc_catalog/"
    "investec_fraud_aml_bronze/landing/transactions"
)


def _iso(ts: datetime) -> str:
    # Spark read_files parses this ISO-8601 form into TIMESTAMP.
    return ts.strftime("%Y-%m-%d %H:%M:%S")


def build_layering(account: str, amount: float, now: datetime) -> list[dict]:
    """A big inflow then a near-equal outflow within 24h (layering passthrough).

    The rapid_movement rule needs inflow >= rapid_min_amount (250k), outflow >=
    inflow * passthrough_ratio (0.90), and first_credit_ts <= last_debit_ts.
    """
    credit_ts = now - timedelta(hours=6)
    debit_ts = now - timedelta(hours=1)
    outflow = round(amount * 0.97, 2)  # 97% passthrough -> clears the 0.90 ratio
    stamp = now.strftime("%Y%m%d%H%M%S")
    return [
        {
            "transaction_id": f"STRM-{stamp}-IN",
            "account_id": account,
            "from_acct": "ACC90000001",  # external originator
            "to_acct": account,
            "direction": "credit",
            "amount": amount,
            "currency": "ZAR",
            "counterparty_id": "TP900001",
            "channel": "wire",
            "txn_ts": _iso(credit_ts),
            "description": "Inbound wire (stream)",
            "source_system": "realtime_feed",
        },
        {
            "transaction_id": f"STRM-{stamp}-OUT",
            "account_id": account,
            "from_acct": account,
            "to_acct": "ACC90000002",  # onward mule
            "direction": "debit",
            "amount": outflow,
            "currency": "ZAR",
            "counterparty_id": "TP900002",
            "channel": "wire",
            "txn_ts": _iso(debit_ts),
            "description": "Onward wire (stream)",
            "source_system": "realtime_feed",
        },
    ]


def build_normal(account: str, count: int, now: datetime) -> list[dict]:
    stamp = now.strftime("%Y%m%d%H%M%S")
    rows = []
    for i in range(count):
        credit = i % 2 == 0
        rows.append(
            {
                "transaction_id": f"STRM-{stamp}-N{i:03d}",
                "account_id": account,
                "from_acct": "ACC90000009" if credit else account,
                "to_acct": account if credit else "ACC90000009",
                "direction": "credit" if credit else "debit",
                "amount": round(100 + (i * 137) % 4000, 2),
                "currency": "ZAR",
                "counterparty_id": f"TP90{i:04d}",
                "channel": ["wire", "card", "app", "branch"][i % 4],
                "txn_ts": _iso(now - timedelta(minutes=i * 3)),
                "description": "Routine activity (stream)",
                "source_system": "realtime_feed",
            }
        )
    return rows


def main() -> None:
    ap = argparse.ArgumentParser(description="Drop transaction JSON into the Sentinel landing volume.")
    ap.add_argument("--scenario", choices=["layering", "normal"], default="layering")
    ap.add_argument("--account", default="ACC00000011", help="target account_id (must exist in silver.accounts)")
    ap.add_argument("--amount", type=float, default=750000.0, help="layering inflow amount (ZAR)")
    ap.add_argument("--count", type=int, default=15, help="row count for --scenario normal")
    ap.add_argument("--profile", default="fevm-elexon-app-for-settlement-acc", help="databricks CLI profile")
    ap.add_argument("--dry-run", action="store_true", help="write the file locally and print it; do not upload")
    args = ap.parse_args()

    now = datetime.now(timezone.utc)
    if args.scenario == "layering":
        rows = build_layering(args.account, args.amount, now)
    else:
        rows = build_normal(args.account, args.count, now)

    # newline-delimited JSON (one object per line) — the read_files json default.
    body = "\n".join(json.dumps(r) for r in rows) + "\n"
    fname = f"txns_{args.scenario}_{now.strftime('%Y%m%d%H%M%S')}_{int(time.time()*1000)%1000:03d}.json"

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
        fh.write(body)
        local_path = fh.name

    print(f"[{args.scenario}] {len(rows)} rows -> {fname}")
    print(body.rstrip())

    if args.dry_run:
        print(f"(dry-run) local file: {local_path}")
        return

    dest = f"{VOLUME_DIR}/{fname}"
    cmd = ["databricks", "fs", "cp", local_path, f"dbfs:{dest}", "--profile", args.profile]
    print("+ " + " ".join(cmd))
    subprocess.run(cmd, check=True)
    os.unlink(local_path)
    print(f"Uploaded to {dest}")


if __name__ == "__main__":
    main()
