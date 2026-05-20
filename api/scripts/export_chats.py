#!/usr/bin/env python3
import argparse
import os
import sys
import time
import requests


def main():
    parser = argparse.ArgumentParser(description="Export chat data via AYO Export API.")
    parser.add_argument(
        "--api-url",
        default="http://localhost:8000",
        help="Base URL of the AYO API (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--cohort-id",
        help="UUID of the cohort to filter by (optional)"
    )
    parser.add_argument(
        "--from-date",
        help="Start date in YYYY-MM-DD format (optional)"
    )
    parser.add_argument(
        "--to-date",
        help="End date in YYYY-MM-DD format (optional)"
    )
    parser.add_argument(
        "--output",
        default="export/export.csv",
        help="Path to save the output CSV file (default: export/export.csv)"
    )
    parser.add_argument(
        "--poll-interval",
        type=int,
        default=5,
        help="Interval in seconds to poll job status (default: 5)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=300,
        help="Maximum time in seconds to wait for job completion (default: 300)"
    )

    args = parser.parse_args()

    # Ensure output directory exists
    output_dir = os.path.dirname(args.output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)


    # Build request payload
    payload = {}
    if args.cohort_id:
        payload["cohort_id"] = args.cohort_id
    if args.from_date:
        payload["date_from"] = args.from_date
    if args.to_date:
        payload["date_to"] = args.to_date

    url = f"{args.api_url.rstrip('/')}/api/chats/export-jobs/"
    print(f"Triggering export job at {url}...")
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error triggering export job: {e}", file=sys.stderr)
        if e.response is not None:
            print(f"Response: {e.response.text}", file=sys.stderr)
        sys.exit(1)

    job_data = response.json()
    job_id = job_data.get("id")
    status = job_data.get("status")
    print(f"Export job created. Job ID: {job_id}. Initial Status: {status}")

    status_url = f"{url}{job_id}/"
    start_time = time.time()

    while True:
        elapsed = time.time() - start_time
        if elapsed > args.timeout:
            print(f"Timeout reached ({args.timeout}s). Job is still running.", file=sys.stderr)
            sys.exit(1)

        try:
            status_response = requests.get(status_url)
            status_response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"Error polling job status: {e}", file=sys.stderr)
            sys.exit(1)

        job_status_data = status_response.json()
        status = job_status_data.get("status")
        print(f"Job Status: {status} (Elapsed: {int(elapsed)}s)")

        if status == "done":
            download_url = job_status_data.get("download_url")
            if not download_url:
                print("Error: Job status is 'done' but download_url is missing.", file=sys.stderr)
                sys.exit(1)

            print(f"Job completed successfully. Downloading CSV from {download_url}...")
            try:
                file_response = requests.get(download_url)
                file_response.raise_for_status()
                with open(args.output, "wb") as f:
                    f.write(file_response.content)
                print(f"Export saved to: {args.output}")
                sys.exit(0)
            except requests.exceptions.RequestException as e:
                print(f"Error downloading exported file: {e}", file=sys.stderr)
                sys.exit(1)

        elif status == "failed":
            error_message = job_status_data.get("error_message") or "Unknown error"
            print(f"Error: Export job failed. Message: {error_message}", file=sys.stderr)
            sys.exit(1)

        time.sleep(args.poll_interval)


if __name__ == "__main__":
    main()
