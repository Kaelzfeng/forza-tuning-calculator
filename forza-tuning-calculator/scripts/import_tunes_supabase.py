"""Batch upsert tunes from local JSON into Supabase public.tunes via REST API.

Uses on_conflict=tune_key to prevent duplicates on re-import.
"""

import json
import os
import re
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

# ── Config ──
JSON_PATH = "data/tunes.json"
BATCH_SIZE = 100

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL:
    print("ERROR: VITE_SUPABASE_URL is not set in .env")
    sys.exit(1)
if not ANON_KEY:
    print("ERROR: VITE_SUPABASE_ANON_KEY is not set in .env")
    sys.exit(1)

REST_URL = f"{SUPABASE_URL.rstrip('/')}/rest/v1"
HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=representation",
}

# ── Helpers ──


def safe_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def clean_drivetrain(raw) -> str | None:
    if not raw:
        return None
    r = str(raw).upper().strip()
    if "AWD" in r or "ALL" in r:
        return "AWD"
    if "RWD" in r or "REAR" in r:
        return "RWD"
    if "FWD" in r or "FRONT" in r:
        return "FWD"
    return None


def clean_class(raw) -> str | None:
    if not raw:
        return None
    r = str(raw).upper().strip()
    m = re.search(r"\b([DCSX]\d?|[AB])\b", r)
    return m.group(1) if m else None


def clean_tune(t: dict, slug_to_id: dict, skipped_reasons: list) -> dict | None:
    vehicle_slug = str(t.get("vehicle_slug", "")).strip()
    if not vehicle_slug:
        skipped_reasons.append("missing vehicle_slug")
        return None

    vehicle_id = slug_to_id.get(vehicle_slug)
    if not vehicle_id:
        skipped_reasons.append(f"vehicle_slug not found: {vehicle_slug}")
        return None

    title = str(t.get("title", "")).strip()
    if not title:
        skipped_reasons.append(f"missing title (slug={vehicle_slug})")
        return None

    share_code = str(t.get("share_code", "")).strip()
    tune_key = f"{vehicle_slug.lower()}|{title.lower()}|{share_code.lower()}"

    return {
        "tune_key": tune_key,
        "vehicle_id": vehicle_id,
        "title": title,
        "share_code": share_code or None,
        "game_mode": str(t.get("game_mode", "")).strip() or None,
        "class": clean_class(t.get("class") or t.get("class_tier")),
        "drivetrain": clean_drivetrain(t.get("drivetrain")),
        "tire_pressure_front": safe_float(t.get("tire_pressure_front")),
        "tire_pressure_rear": safe_float(t.get("tire_pressure_rear")),
        "gear_final_drive": safe_float(t.get("gear_final_drive")),
        "camber_front": safe_float(t.get("camber_front")),
        "camber_rear": safe_float(t.get("camber_rear")),
        "toe_front": safe_float(t.get("toe_front")),
        "toe_rear": safe_float(t.get("toe_rear")),
        "antiroll_front": safe_float(t.get("antiroll_front")),
        "antiroll_rear": safe_float(t.get("antiroll_rear")),
        "spring_front": safe_float(t.get("spring_front")),
        "spring_rear": safe_float(t.get("spring_rear")),
        "ride_height_front": safe_float(t.get("ride_height_front")),
        "ride_height_rear": safe_float(t.get("ride_height_rear")),
        "brake_balance": safe_float(t.get("brake_balance")),
        "brake_pressure": safe_float(t.get("brake_pressure")),
        "diff_accel": safe_float(t.get("diff_accel")),
        "diff_decel": safe_float(t.get("diff_decel")),
        "notes": str(t.get("notes", "")).strip() or None,
    }


# ── Main ──
def main():
    # 1. Load JSON
    json_path = Path(JSON_PATH)
    if not json_path.exists():
        print(f"ERROR: File not found — {json_path}")
        sys.exit(1)

    with open(json_path, encoding="utf-8") as f:
        raw = json.load(f)

    if isinstance(raw, list):
        source = raw
    elif isinstance(raw, dict):
        source = raw.get("tunes") or raw.get("data") or []
    else:
        print("ERROR: Unsupported JSON structure")
        sys.exit(1)

    print(f"Loaded {len(source)} raw entries from {JSON_PATH}")

    # 2. Fetch vehicle slug → id map
    print("Fetching vehicle map from Supabase ...")
    slug_to_id = {}
    try:
        resp = requests.get(
            f"{REST_URL}/vehicles?select=id,slug",
            headers=HEADERS,
            timeout=30,
        )
        if resp.status_code in (200, 201):
            vehicles = resp.json()
            for v in vehicles:
                slug_to_id[v["slug"]] = v["id"]
            print(f"  {len(slug_to_id)} vehicles found")
        else:
            print(f"  ERROR fetching vehicles (HTTP {resp.status_code}): {resp.text[:200]}")
            sys.exit(1)
    except requests.RequestException as e:
        print(f"  ERROR fetching vehicles: {e}")
        sys.exit(1)

    # 3. Clean and validate
    tunes = []
    skipped = 0
    skip_reasons = []

    for t in source:
        cleaned = clean_tune(t, slug_to_id, skip_reasons)
        if cleaned:
            tunes.append(cleaned)
        else:
            skipped += 1

    print(f"Valid: {len(tunes)}  Skipped: {skipped}")

    if skip_reasons:
        print("Skip reasons (first 10):")
        for r in skip_reasons[:10]:
            print(f"  - {r}")
        if len(skip_reasons) > 10:
            print(f"  ... and {len(skip_reasons) - 10} more")

    if not tunes:
        print("\nNo valid tunes to import.")
        return

    # 4. Batch insert (plain INSERT, no on_conflict)
    batches = [tunes[i:i + BATCH_SIZE] for i in range(0, len(tunes), BATCH_SIZE)]
    total_batches = len(batches)
    uploaded = 0
    failed = 0

    print(f"Upserting {len(tunes)} tunes in {total_batches} batches "
          f"(up to {BATCH_SIZE}/batch) ...")

    for batch_idx, batch in enumerate(batches):
        batch_num = batch_idx + 1
        try:
            resp = requests.post(
                f"{REST_URL}/tunes?on_conflict=tune_key",
                json=batch,
                headers=HEADERS,
                timeout=30,
            )
            if resp.status_code in (200, 201):
                rows = resp.json()
                count = len(rows) if isinstance(rows, list) else len(batch)
                uploaded += len(batch)
                print(f"  Batch {batch_num}/{total_batches} — rows: {count}")
            else:
                failed += len(batch)
                print(f"  Batch {batch_num}/{total_batches} — FAILED "
                      f"(HTTP {resp.status_code})")
                print(f"    Response: {resp.text[:300]}")
        except requests.RequestException as e:
            failed += len(batch)
            print(f"  Batch {batch_num}/{total_batches} — ERROR: {e}")

    # ── Summary ──
    print(f"\n--- Import Summary ---")
    print(f"  Total raw:      {len(source)}")
    print(f"  Valid:          {len(tunes)}")
    print(f"  Skipped:        {skipped}")
    print(f"  Uploaded:       {uploaded}")
    print(f"  Failed:         {failed}")


if __name__ == "__main__":
    main()
