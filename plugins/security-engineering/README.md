# AIWG Security Engineering

Applied security engineering framework for cryptographic primitive selection, chain-of-trust integrity, and physical-threat modeling.

## Features

- **Applied Cryptography Review**: AEAD selection, KDF correctness, key separation, openssl flag verification
- **Chain-of-Trust Design**: Bootstrap integrity, signing key custody, measured boot
- **Authentication Factor Design**: have/know/are mapping, coercion-resistance, FIDO2 PIN/UV policy
- **Supply-Chain Trust**: Beyond CVE/SBOM — pinning depth, reproducible builds, firmware version locking
- **Physical Threat Modeling**: Evil-maid, DMA, hostile peripherals, cold-boot, side-channel

## Agents

- `applied-cryptographer` - Crypto primitive selection and KDF correctness
- `secure-bootstrap-reviewer` - Chain-of-trust integrity

## Quick Start

```bash
# Crypto primitive selection
/crypto-primitive-selection

# Chain-of-trust design
/chain-of-trust-design

# Auth factor design
/auth-factor-design
```

## Documentation

- Full guide: https://docs.aiwg.io/security-engineering
- Discord: https://discord.gg/BuAusFMxdA
