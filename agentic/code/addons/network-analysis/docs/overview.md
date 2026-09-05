# Network analysis addon overview

The addon is the provider-neutral boundary between packet-analysis tools and
AIWG workflows. It owns capability probing, recipes, bounded execution,
normalization, evidence identity, and handoff contracts. It does not own packet
acquisition permissions or investigative conclusions.

TShark is the required machine interface. `capinfos` validates supported saved
capture formats and metadata. Termshark is optional and receives only an
operator-reviewed local argument array. Missing optional tools degrade the
interactive handoff without invalidating offline evidence.

Start with the addon README and `analyze-network-capture` skill. The approved
threat model and construction gate remain authoritative for safety controls.
