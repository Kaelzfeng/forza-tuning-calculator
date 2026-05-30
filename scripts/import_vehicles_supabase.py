"""Batch upsert vehicles from local JSON to Supabase public.vehicles via REST API."""

import json
import os
import re
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

# ── Config ──
JSON_PATH = "data/vehicles.json"
BATCH_SIZE = 100

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL:
    print("ERROR: VITE_SUPABASE_URL is not set in .env")
    sys.exit(1)
if not ANON_KEY:
    print("ERROR: VITE_SUPABASE_ANON_KEY is not set in .env")
    sys.exit(1)

ENDPOINT = f"{SUPABASE_URL.rstrip('/')}/rest/v1/vehicles"
HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=representation",
}

# ── Helpers ──
VALID_DRIVETRAINS = {"AWD", "RWD", "FWD"}


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def safe_int(value) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
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


def clean_vehicle(v: dict, index: int) -> dict | None:
    name = str(v.get("name", "")).strip()
    if not name or len(name) < 2:
        return None

    slug = v.get("slug") or slugify(name)

    return {
        "slug": slug,
        "name": name,
        "manufacturer": str(v.get("manufacturer", "")).strip(),
        "year": safe_int(v.get("year")),
        "drivetrain": clean_drivetrain(v.get("drivetrain")),
        "country": str(v.get("country", "")).strip() or None,
        "class": clean_class(v.get("class") or v.get("class_tier")),
        "horsepower": safe_int(v.get("horsepower") or v.get("hp") or v.get("power")),
        "weight": safe_int(v.get("weight") or v.get("weight_kg")),
        "image_url": str(v.get("image_url") or v.get("imageUrl") or v.get("image") or "").strip() or None,
        "description": str(v.get("description", "")).strip() or None,
    }


# ── Main ──
def main():
    # Load JSON
    json_path = Path(JSON_PATH)
    if not json_path.exists():
        print(f"ERROR: File not found — {json_path}")
        sys.exit(1)

    with open(json_path, encoding="utf-8") as f:
        raw = json.load(f)

    if isinstance(raw, list):
        source = raw
    elif isinstance(raw, dict):
        source = raw.get("vehicles") or raw.get("cars") or raw.get("data") or []
    else:
        print("ERROR: Unsupported JSON structure")
        sys.exit(1)

    print(f"Loaded {len(source)} raw entries from {JSON_PATH}")

    # Clean and validate
    vehicles = []
    skipped = 0
    for i, v in enumerate(source):
        cleaned = clean_vehicle(v, i)
        if cleaned:
            vehicles.append(cleaned)
        else:
            skipped += 1

    # Deduplicate by slug
    seen = set()
    deduped = []
    for v in vehicles:
        if v["slug"] not in seen:
            seen.add(v["slug"])
            deduped.append(v)
        else:
            skipped += 1

    print(f"Valid: {len(deduped)}  Skipped: {skipped}")

    # Batch upsert
    batches = [deduped[i:i + BATCH_SIZE] for i in range(0, len(deduped), BATCH_SIZE)]
    total_batches = len(batches)
    uploaded = 0
    failed = 0

    print(f"Upserting {len(deduped)} vehicles in {total_batches} batches "
          f"(up to {BATCH_SIZE}/batch) ...")

    for batch_idx, batch in enumerate(batches):
        batch_num = batch_idx + 1
        url = f"{ENDPOINT}?on_conflict=slug"
        try:
            resp = requests.post(url, json=batch, headers=HEADERS, timeout=30)
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
    print(f"  Valid:          {len(deduped)}")
    print(f"  Skipped:        {skipped}")
    print(f"  Uploaded:       {uploaded}")
    print(f"  Failed:         {failed}")


if __name__ == "__main__":
    main()
