# Network Analysis Probe Fixtures

These files are representative synthetic excerpts used to exercise parser behavior for the `#2271` probe tests. They are shaped after observed CLI output patterns for `tshark`, `capinfos`, and `termshark`, but they are not captured live host output and should not be cited as platform qualification evidence.

The actual read-capability check in `src/network-analysis/probe.ts` uses temporary synthetic empty `pcap` and `pcapng` files at runtime.
