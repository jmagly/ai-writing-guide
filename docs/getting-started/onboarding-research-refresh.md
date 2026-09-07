# Onboarding Research Refresh

> **First time using AIWG?** Begin with [Install, Connect, and Verify](install-connect-verify.md). This guide assumes
AIWG is connected to the target project and your provider session can read the deployed context.

This note refreshes the evidence base for beginner onboarding. The practical problem is narrow: AIWG needs first-run guidance that helps a beginner build the right mental model, calibrate trust, and verify what the agent actually did.

We chose a bounded refresh instead of a broad literature review because the docs decision is already scoped. While 5 sources are not a full survey, they are enough to test whether the current Start Here pattern is still defensible in 2026.

Validation baseline: revisit this note when AIWG version 2026.5 onboarding claims change. While the source set is small, maintainers should record any issue that failed because a newer study contradicts the current trust-calibration guidance.

## Accepted Sources

| Source | Why it matters for AIWG |
|---|---|
| IBM Research / IUI 2025, [Building Appropriate Mental Models: What Users Know and Want to Know about an Agentic AI Chatbot](https://research.ibm.com/publications/building-appropriate-mental-models-what-users-know-and-want-to-know-about-an-agentic-ai-chatbot) | Directly studies an agentic chatbot. N=24 participants often understood the system as search-like but missed the generative model and agentic framework behind actions. |
| Google Research / CHI EA 2024, [Experiencing InstructPipe](https://research.google/pubs/experiencing-instructpipe-building-multi-modal-ai-pipelines-via-prompting-llms-and-visual-programming/) | Studies novice construction of AI pipelines. The formative work used 58 contributors and 236 proposed pipelines, which supports AIWG's plain-language-to-workflow translation path. |
| Scharowski et al. / FAccT 2025, [To Trust or Distrust AI: A Questionnaire Validation Study](https://facctconference.org/static/docs/facct2025-206archivalpdfs/facct2025-final132-acmpaginated.pdf) | Validates trust/distrust measurement in an AI setting with N=1485 and argues that trust and distrust should be measured separately. This matters for onboarding surveys and dry-run notes. |
| IJHCS 2025, [Appropriate reliance in XAI systems](https://www.sciencedirect.com/science/article/pii/S1389041725000373) | Clarifies trust, distrust, plus reliance. Useful background for avoiding "increase trust" language; the goal is appropriate reliance. |
| Steinmetz et al. 2025, [The Trust Calibration Maturity Model](https://arxiv.org/abs/2503.15511) | Proposes five trustworthiness communication dimensions covering performance, bias/robustness, transparency, safety/security, plus usability. Useful as a checklist for what the status probe should and should not claim. |

## Synthesis

We found one repeated pattern across these sources: users need visible system-action transparency, not more branding. AIWG should show the project root, deployed provider files, installed frameworks, and next command because those are observable. It should avoid claiming that a provider session will behave correctly unless there is field evidence for that provider.

The onboarding implication is concrete:

1. Keep Start Here focused on one path.
2. Translate ordinary user goals into 2 to 4 `aiwg discover` phrases.
3. Require `aiwg show` before recommending a capability.
4. Use `aiwg status --probe --json` as a local evidence surface.
5. In validation notes, record trust and distrust signals separately.

## Design Decisions Reinforced

| AIWG decision | Evidence support |
|---|---|
| Status probe reports observable facts, not passive attribution. | IBM/IUI 2025 and TCMM both support transparency about actions and limits. |
| Beginner docs avoid framework catalogs. | InstructPipe reinforces text-to-workflow translation for novices. |
| Provider behavior remains gated on field evidence. | Trust-calibration sources warn against overclaiming system capability. |
| Validation uses dry-run notes, not mandatory telemetry. | FAccT 2025 and IJHCS 2025 support careful measurement of reliance, trust, plus distrust. |

## Induction Follow-Up

These sources should be considered for formal induction in the shared research corpus if this evidence becomes release-critical. The strongest candidates are the IBM/IUI 2025 agentic mental-model paper, the FAccT 2025 trust/distrust validation paper, plus the IJHCS 2025 trust/reliance survey.

Use the same 80% evidence discipline from the provider matrix when turning this note into release claims: a source can support a design decision, but it does not prove provider behavior.

## Related

- [Onboarding Validation](onboarding-validation.md)
- [Provider Handoff](provider-handoff.md)
- [Beginner Language Map](language-map.md)
