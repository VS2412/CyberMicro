# Demo evidence files (fictional)

Sample files for the Watchman demo. All data is invented; IP addresses come from ranges
reserved for documentation (RFC 5737), so they can never point at a real system.

| File | Use in the demo |
|---|---|
| `waf-export-2026-10-06.csv` | Drag into **Evidence** to register it: the browser computes its SHA-256 fingerprint |
| `sentinel-incident-4127.json` | The original Sentinel alert, as a second evidence item |
| `waf-export-2026-10-06.ALTERED.csv` | The same log with one line silently deleted. Use **Re-verify** with this file to show a fingerprint MISMATCH |
