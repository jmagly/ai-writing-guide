# DPIA Trigger Assessment Checklist

## Purpose

This checklist determines whether a Data Protection Impact Assessment (DPIA) is required for a project or processing activity under **GDPR Article 35**.

Use this at **project intake** to flag DPIA requirements early in the SDLC.

## Regulatory Requirement

**GDPR Article 35(1)**: "Where a type of processing is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall, prior to the processing, carry out an assessment of the impact of the envisioned processing operations on the protection of personal data."

**GDPR Article 35(3)** lists specific triggers requiring DPIA.

## Assessment

| Field | Value |
|-------|-------|
| Project Name | `[Project/System Name]` |
| Assessment Date | `[YYYY-MM-DD]` |
| Assessor | `[Privacy Officer, Project Owner, Data Protection Officer]` |
| Project Phase | `[Intake/Inception/Elaboration]` |

## GDPR Article 35(3) Mandatory Triggers

Check all that apply. **If ANY box is checked, a DPIA is required.**

### 1. Automated Decision-Making with Legal or Significant Effects (Art. 22)

- [ ] **Systematic and extensive evaluation of personal aspects** based on automated processing (including profiling)
- [ ] Produces **legal effects** (e.g., contract termination, credit denial, employment decisions)
- [ ] **Similarly significantly affects** the data subject (e.g., targeted advertising, pricing discrimination)

**Examples**:
- Credit scoring or loan approval algorithms
- Automated employment candidate screening
- Insurance premium calculation based on behavioral data
- Targeted advertising with significant economic impact

**DPIA Required?**: `[Yes/No]`

### 2. Large-Scale Processing of Special Category Data (Art. 9) or Criminal Convictions Data (Art. 10)

- [ ] Processing **special category data** at scale (health, biometric, genetic, racial/ethnic origin, political opinions, religious beliefs, trade union membership, sex life/sexual orientation)
- [ ] Processing **criminal convictions or offenses data** (Art. 10)
- [ ] **Large scale** (consider number of data subjects, volume, geographic scope, duration)

**Examples**:
- Hospital patient record system
- Biometric authentication for large user base
- Genetic testing service
- Criminal background check platform

**Large Scale Indicators**:
- [ ] Affects >10,000 data subjects
- [ ] Spans multiple countries
- [ ] Continuous or long-term processing
- [ ] Significant proportion of population affected

**DPIA Required?**: `[Yes/No]`

### 3. Systematic Monitoring of Publicly Accessible Areas at Large Scale

- [ ] **Systematic monitoring** (regular, organized, ongoing)
- [ ] **Publicly accessible areas** (streets, malls, public transport, online public spaces)
- [ ] **Large scale** (geographic area, duration, number of individuals)

**Examples**:
- CCTV surveillance system (city-wide, building-wide)
- Tracking individuals across public WiFi networks
- Monitoring social media for behavioral analysis
- License plate recognition systems

**DPIA Required?**: `[Yes/No]`

## EDPB/WP29 Additional High-Risk Criteria

**European Data Protection Board (EDPB)** guidance identifies additional triggers. Check all that apply.

### 4. Evaluation or Scoring

- [ ] Profiling or predicting behavior, preferences, or reliability
- [ ] Scoring creditworthiness, health, performance, economic situation, location, movements

**DPIA Required?**: `[Yes/No]`

### 5. Automated Decision-Making (Without Legal Effects)

- [ ] Automated processing that affects individuals even without legal/significant effects

**DPIA Required?**: `[Yes/No]`

### 6. Systematic Monitoring

- [ ] Systematic monitoring beyond public areas (e.g., employee monitoring, website tracking)

**DPIA Required?**: `[Yes/No]`

### 7. Processing Sensitive Data or Highly Personal Data

- [ ] Special category data (even if not large scale)
- [ ] Data concerning vulnerable individuals (children, employees, patients, asylum seekers)

**DPIA Required?**: `[Yes/No]`

### 8. Large-Scale Processing

- [ ] Processing affects large number of data subjects (>10,000)
- [ ] OR processing covers substantial geographic area
- [ ] OR significant volume of data per individual

**DPIA Required?**: `[Yes/No]`

### 9. Matching or Combining Datasets

- [ ] Combining data from multiple sources in ways unexpected by data subjects
- [ ] Data from different contexts (e.g., public + private sector data)

**DPIA Required?**: `[Yes/No]`

### 10. Data Concerning Vulnerable Individuals

- [ ] Children (under 16, or member state threshold)
- [ ] Employees (power imbalance)
- [ ] Patients (vulnerable state)
- [ ] Elderly, disabled, asylum seekers, or other vulnerable populations

**DPIA Required?**: `[Yes/No]`

### 11. Innovative Technology Use or Novel Application

- [ ] AI/machine learning applications
- [ ] Biometric recognition (facial, fingerprint, voice)
- [ ] Blockchain or distributed ledger
- [ ] Internet of Things (IoT) at scale
- [ ] New technology with unclear privacy implications

**DPIA Required?**: `[Yes/No]`

### 12. Processing Prevents Data Subjects from Exercising Rights

- [ ] Processing makes it difficult to exercise right to access, rectification, or erasure
- [ ] Lack of transparency or overly complex systems
- [ ] Inability to opt-out or object

**DPIA Required?**: `[Yes/No]`

## Supervisory Authority-Specific Requirements

**Check your supervisory authority's "blacklist" of processing requiring DPIA**:

- [ ] Processing appears on `[Country]` supervisory authority's mandatory DPIA list
- [ ] Authority: `[e.g., CNIL (France), ICO (UK), BfDI (Germany)]`
- [ ] List URL: `[Link to authority guidance]`
- [ ] Specific triggers from authority list: `[Describe]`

**DPIA Required?**: `[Yes/No]`

## Final Determination

### DPIA Required?

- [ ] **YES** - One or more triggers identified above
- [ ] **NO** - No triggers identified; proceed without DPIA
- [ ] **UNCERTAIN** - Consult Data Protection Officer for ruling

### Justification

`[Explain reasoning. If Yes: which triggers. If No: why none apply. If Uncertain: specific ambiguities.]`

### Multiple Triggers

If **two or more criteria** apply, a DPIA is **almost always required** per EDPB guidance.

Number of triggers identified: `[Count]`

### DPO Consultation

If uncertain or if processing is novel:

- [ ] Data Protection Officer consulted
- **DPO Name**: `[Name]`
- **Consultation Date**: `[Date]`
- **DPO Ruling**: `[DPIA Required / Not Required / Requires Supervisory Authority Opinion]`

## Next Steps

### If DPIA Required

1. [ ] Flag project as "DPIA Required" in project intake
2. [ ] Assign Privacy Officer as DPIA lead
3. [ ] Draft DPIA using Privacy Impact Assessment Template
4. [ ] DPIA must be approved **before detailed design** (end of Inception phase)
5. [ ] DPIA approval is **gate criteria** for proceeding to Elaboration

### If DPIA Not Required

1. [ ] Document justification in project intake
2. [ ] Proceed with standard privacy controls (data classification, lawful basis assessment, consent management)
3. [ ] Privacy Officer available for consultation throughout project

### If Prior Consultation Required (Art. 36)

If DPIA shows **high residual risk** after mitigations:

1. [ ] Consult supervisory authority **before processing begins**
2. [ ] DPO coordinates consultation
3. [ ] Processing **cannot begin** until authority approves

## Integration with SDLC

### Intake Phase

- [ ] Complete this checklist as part of project intake
- [ ] Set DPIA flag in project intake document if required

### Inception Phase (If DPIA Required)

- [ ] Draft DPIA
- [ ] DPO approval
- [ ] DPIA is **gate criteria** for Inception exit

### Ongoing

- [ ] Re-assess if processing changes materially (new data types, new purposes, new technology)
- [ ] Update DPIA annually if processing continues

## Approval

| Role | Name | DPIA Required? | Signature | Date |
|------|------|----------------|-----------|------|
| **Assessor** | `[Name]` | `[Yes/No]` | `[Signature]` | `[Date]` |
| **Data Protection Officer** | `[Name]` | `[Yes/No]` | `[Signature]` | `[Date]` |
| **Privacy Officer** | `[Name]` | `[Yes/No]` | `[Signature]` | `[Date]` |

---

**References**:
- GDPR Article 35: [https://gdpr-info.eu/art-35-gdpr/](https://gdpr-info.eu/art-35-gdpr/)
- EDPB Guidelines on DPIA (WP248rev.01): [https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-data-protection-impact-assessment-dpia-and_en](https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-data-protection-impact-assessment-dpia-and_en)
- ICO DPIA Guidance: [https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/accountability-and-governance/data-protection-impact-assessments/](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/accountability-and-governance/data-protection-impact-assessments/)
