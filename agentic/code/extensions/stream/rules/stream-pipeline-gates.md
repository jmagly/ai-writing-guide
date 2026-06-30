---
enforcement: high
---

# Stream Pipeline Change Gates

**Enforcement Level**: HIGH
**Scope**: All streaming pipeline configurations, transcode profiles, and relay changes
**Issue**: #776

## Principle

Pipeline changes in streaming infrastructure affect live audiences. A misconfigured transcode profile or broken relay causes immediate, visible service degradation — dropped streams, frozen video, audio desync, or complete platform disconnection. Unlike a web deployment that can be canary-tested with a fraction of traffic, a broken stream relay is immediately noticed by every viewer. All pipeline changes must be validated through a test stream before production cutover.

## Mandatory Rules

1. **Test stream before production cutover**: Every change to a transcode profile, relay destination, encoder configuration, or pipeline playbook must be validated with a test stream using a synthetic source (`ffmpeg -f lavfi`) before being applied to a live broadcast. No exceptions for "minor" changes — keyframe interval adjustments and bitrate tweaks both have immediate viewer impact.

2. **Quality verification after transcode profile changes**: When a transcode profile is modified (codec, resolution, framerate, bitrate, preset, keyframe interval), the test stream output must be probed to verify actual values match expected values within tolerance:
   - Bitrate: within ±15% of configured value
   - Framerate: matches configured value exactly (29.97 ≠ 30)
   - Resolution: exact match
   - Keyframe interval: within ±0.1s of configured value

3. **Relay destination verification before removing old destinations**: When adding or changing relay destinations, the new destination must be verified as receiving before the old destination is removed. Never remove a working relay destination as the first step in a migration.

4. **No hot-swapping codecs during active streams**: Codec changes (h264 ↔ h265 ↔ av1) require a full stream restart with a failover window. Codec changes cannot be applied via `systemctl reload` — they require stopping the stream, applying the change, running a test stream, and restarting. Platform decoders do not gracefully handle mid-stream codec switches.

5. **Platform encoding requirements must be verified**: Each platform has specific encoding requirements that are not interchangeable:
   - YouTube: requires keyframe interval of exactly 2s; rejects non-yuv420p pixel formats
   - Twitch: maximum 6000kbps; rejects streams above bitrate cap without error
   - Facebook Live: requires baseline profile h264 for mobile compatibility
   - SRT endpoints: latency and passphrase settings must match receiver configuration exactly
   Verify platform requirements before applying a new profile to that platform's destination.

6. **Latency measurements required before and after pipeline changes**: Record end-to-end latency (ingest to viewer) before making pipeline changes. Verify latency is within acceptable range after applying changes. Latency increases of more than 30% indicate buffering issues that will manifest as stream instability under load.

7. **Changes outside peak viewership windows**: Pipeline changes must be executed outside peak viewership hours unless responding to an active incident. If an emergency change is required during peak hours, document the justification in the incident record.

8. **Rollback procedure must be documented before cutover**: Before applying any pipeline change to production, the rollback procedure must be explicitly written out. "Undo the change" is not a rollback procedure. Required: specific commands to restore the previous configuration and estimated time to restore.

## Validation Checklist

All items must be checked before approving production cutover:

- [ ] Test stream ran successfully with new configuration (minimum 30s duration)
- [ ] Video bitrate within ±15% of configured value
- [ ] Audio bitrate within ±10% of configured value
- [ ] Framerate matches configured value exactly
- [ ] Keyframe interval within ±0.1s of configured value
- [ ] Resolution matches configured value
- [ ] No dropped frames during test stream
- [ ] All destination platforms verified receiving (dashboard check, not just ffmpeg exit code)
- [ ] Latency measured and within acceptable range (or increase documented)
- [ ] Platform-specific requirements verified for each affected destination
- [ ] Rollback procedure written and reviewed
- [ ] Change executed outside peak viewership window (or emergency documented)
- [ ] No literal credentials in updated configuration files
- [ ] Environment files and key refs populated on all target hosts

## Test Stream Command

Use this standard test stream command to validate pipeline changes. Replace parameters with profile values being tested.

```bash
# Standard test stream: 30-second synthetic source
# Replace {ENDPOINT}, {KEY_FILE}, and encoder options with values under test
KEY=$(cat "${KEY_FILE}")
ffmpeg \
  -f lavfi -i "testsrc=duration=30:size={resolution}:rate={framerate}" \
  -f lavfi -i "sine=frequency=440:duration=30" \
  -c:v libx264 \
  -preset {preset} \
  -b:v {bitrate}k -maxrate {bitrate}k -bufsize {2x-bitrate}k \
  -g {keyframe_interval_frames} -keyint_min {keyframe_interval_frames} \
  -pix_fmt yuv420p \
  -c:a aac -b:a {audio_bitrate}k \
  -f flv "${ENDPOINT}/${KEY}" \
  2>&1 | tail -15
unset KEY
```

Probe the output for quality verification:

```bash
# Probe relay output after test stream starts
ffprobe -v quiet -select_streams v:0 \
  -show_entries stream=bit_rate,r_frame_rate,width,height \
  -of default=noprint_wrappers=1 \
  "{relay-url}" 2>&1
```

## Enforcement

Agents implementing pipeline changes via the `stream-deploy` skill or `stream-pipeline.yaml` playbook must:

1. Include the `validate-encoder-config` step before any `start-transcode` step
2. Include the `verify-transcode-output` step with quality metric verification after transcode starts
3. Include the `approve-relay-cutover` gate before starting relay to live platforms
4. Record test stream results in the deployment log

Agents must not skip or mark steps as `on_failure: warn` for the validation, verification, or gate steps listed above. Skipping validation steps must be treated as a blocker, not a warning.

## Rationale

Streaming pipeline changes have immediate audience-visible impact with no graceful degradation path. A broken web service returns an error page; a broken stream relay drops every viewer simultaneously. The test stream gate is the only reliable way to verify a configuration change before it affects a live audience. Enforcing this gate consistently — even for changes that seem minor — is cheaper than diagnosing a live outage and managing viewer impact.

Platform encoding requirements are not advisory. Platforms silently reject or throttle streams that violate their requirements, producing failures that are difficult to diagnose because the stream may appear to connect successfully while being rejected downstream.
