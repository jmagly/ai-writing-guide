# Bill of Materials Template

## Cover Page

- `<Project Name>`
- `Bill of Materials`
- `Version <1.0>`

## Revision History

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| `<dd/mmm/yy>` | `<x.x>` | `<details>` | `<name>` |

## Ownership & Collaboration

- Document Owner: Integrator
- Contributor Roles: Configuration Manager, Deployment Manager
- Automation Inputs: Release manifest, package checksums, licensing notes
- Automation Outputs: `bill-of-materials.md` enumerating sections 2.1–2.6

## 1 Introduction

> Summarize document purpose, audience, references, and organization.

### 1.1 Purpose

### 1.2 Scope

### 1.3 Definitions, Acronyms, and Abbreviations

### 1.4 References

### 1.5 Overview

## 2 Version Description

### 2.1 Inventory of Materials

> List physical media and documentation included in this release (media IDs, titles, dates, versions).

#### 2.1.1 Handling Considerations

> State storage, duplication, licensing, or safety considerations.

### 2.2 Inventory of Software Contents

> Enumerate software files and packages with version identifiers.

### 2.3 Changes

> Summarize changes from prior release, referencing problem reports or change requests.

### 2.4 Adaptation Data

> Identify site-specific data, configuration, or localization content packaged with the release.

### 2.5 Installation Instructions

> Reference installation guides or list essential steps and verification checks.

### 2.6 Known Errors and Problematic Features

> Document known issues, workarounds, or mitigations relevant to the release.

## Appendices (Optional)

> Include manifests, checksum listings, or shipment details as required.

## Agent Notes

- Record artifact hashes to support reproducibility and integrity checks.
- Note licensing or distribution restrictions for each material.
- Verify the Automation Outputs entry is satisfied before signaling completion.
- Record hashes/signatures for each material to support reproducibility.
