#!/usr/bin/env python3
"""Build markdown research-corpus indices from REF and citation sidecars.

This is the executable companion for the corpus-index-build skill. It is
intentionally dependency-light: PyYAML is used when available for real YAML
frontmatter/config parsing; a small fallback parser handles the common scalar
and list forms used by older corpora.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore
except Exception:  # pragma: no cover - exercised only in minimal Python envs
    yaml = None


REF_FILE_RE = re.compile(r"^REF-(\d{3,4}[a-z]?)-")
REF_ID_RE = re.compile(r"REF-\d{3,4}[a-z]?")
YEAR_RE = re.compile(r"\b(19|20)(\d{2})\b")

TOPIC_PATTERNS = [
    ("Reinforcement Learning & RLHF", r"\b(rlhf|reinforcement learning|rlvr|reward model|ppo|dpo|grpo)\b"),
    ("Mechanistic Interpretability", r"\b(mechanistic interpret|circuit|feature attribution|sparse autoencoder|activation steering|probing)\b"),
    ("AI Safety & Alignment", r"\b(alignment|misalign|sycophan|deception|jailbreak|red team|safety|constitutional ai)\b"),
    ("Agentic Workflows & Multi-Agent", r"\b(agentic|multi-agent|multi[- ]agent|tool use|orchestrat|autogen|agent loop)\b"),
    ("Retrieval & RAG", r"\b(rag|retrieval[- ]augmented|dense retriev|reranker|bm25|colbert|hybrid retriev)\b"),
    ("Embeddings & Vector Search", r"\b(embedding|sentence-bert|hnsw|ann |vector search|matryoshka)\b"),
    ("Reasoning & Chain-of-Thought", r"\b(chain[- ]of[- ]thought|reasoning|self-refine|self-consist|cot prompt|thought)\b"),
    ("Code Generation & Software Engineering", r"\b(code generation|code llama|humaneval|mbpp|swe-bench|copilot|coding assistant)\b"),
    ("Fine-Tuning & PEFT", r"\b(lora|peft|fine[- ]tun|adapter|qlora|instruction tun)\b"),
    ("Pretraining & Scaling Laws", r"\b(scaling laws|chinchilla|pretrain|compute[- ]optimal|emergent abilit)\b"),
    ("Quantization & Compression", r"\b(quantization|pruning|gptq|awq|distillation|compression)\b"),
    ("Inference & Serving Systems", r"\b(vllm|tensorrt|inference serv|kv cache|continuous batch|paged attention|serving)\b"),
    ("Memory & Context", r"\b(long context|context window|memory augment|stateful|kv-cache memory)\b"),
    ("Robotics & Embodied AI", r"\b(robot|embodied|manipulation|locomotion|vla |vision[- ]language[- ]action)\b"),
    ("Multimodal", r"\b(multimodal|vision[- ]language|vlm|clip|image[- ]text)\b"),
    ("Benchmarks & Evaluation", r"\b(benchmark|evaluat|helm|big-bench|mt-bench|leaderboard)\b"),
    ("Knowledge Graphs & Symbolic", r"\b(knowledge graph|symbolic|ontolog|rdf|sparql)\b"),
    ("Streaming & Event-Driven Systems", r"\b(kafka|redis stream|nats|event[- ]driven|cdc|change data capt|stream process)\b"),
    ("Distributed Systems", r"\b(distributed system|consensus|raft|paxos|sharding|replicat)\b"),
    ("Cryptography & Security", r"\b(cryptograph|threshold signature|frost|schnorr|hkdf|argon2|tpm|hsm|secure enclave)\b"),
    ("Blockchain", r"\b(blockchain|proof of stake|ethereum|validator)\b"),
    ("HCI & Developer Experience", r"\b(developer productiv|hci|cognitive load|user study|ux research|developer experience)\b"),
    ("Theory of Mind & Social Reasoning", r"\b(theory of mind|tom |social reason|persuas|emotion)\b"),
    ("Cognitive Science & Psychology", r"\b(cognitive scien|psycholog|metacognit|miller'?s law)\b"),
    ("LLM Foundations & Surveys", r"\b(survey|foundation model|large language model|transformer architecture)\b"),
    ("LLM Evaluation & Benchmarks", r"\b(llm|language model|gpt|claude|gemini|llama|mistral)\b"),
]

METHOD_PATTERNS = [
    ("Quantization", r"\b(quantiz|gptq|awq|int4|int8|bf16|fp4|fp8|bitnet|smoothquant)\b"),
    ("Pruning & Sparsity", r"\b(prun|sparsit|sparse model|magnitude prun|wanda|sparsegpt)\b"),
    ("Distillation", r"\b(distill|distilbert|teacher[- ]student|knowledge distill)\b"),
    ("PEFT / LoRA / Adapters", r"\b(lora|qlora|peft|adapter[- ]based|prefix tun|prompt tun|p-?tuning)\b"),
    ("Fine-Tuning (Full)", r"\b(full fine[- ]tun|sft|supervised fine[- ]tun|instruction tun)\b"),
    ("RLHF / DPO / RL-from-Feedback", r"\b(rlhf|dpo|ppo|grpo|reward model|kto|ipo|orpo|reinforcement learning from human)\b"),
    ("RLVR / Verifiable Rewards", r"\b(rlvr|verifiable reward|rule[- ]based reward|self[- ]reward)\b"),
    ("Alignment & Constitutional", r"\b(constitutional ai|alignment|rule[- ]based ai feedback|rlaif)\b"),
    ("Chain-of-Thought / Reasoning", r"\b(chain[- ]of[- ]thought|cot prompt|self[- ]refine|self[- ]consist|tree of thoughts|react)\b"),
    ("Self-Play / Self-Improvement", r"\b(self[- ]play|self[- ]improv|bootstrap|star algorithm|rstar)\b"),
    ("Mixture of Experts", r"\b(mixture of experts|\bmoe\b|gshard|switch transformer|expert routing)\b"),
    ("Retrieval-Augmented Generation", r"\b(retrieval[- ]augmented|\brag\b|fid |dense retriev|colbert)\b"),
    ("Embedding & Vector Search", r"\b(embedding|sentence-bert|hnsw|matryoshka|vector index)\b"),
    ("Attention Variants & Long Context", r"\b(flash attention|sliding window attention|sparse attention|paged attention|ring attention|alibi|rotary embedding|rope)\b"),
    ("KV Cache & Inference Optimization", r"\b(kv[- ]cache|kv cache|continuous batching|paged attention|prefill|decode optimization|speculative decoding)\b"),
    ("Serving & Batching Systems", r"\b(vllm|tensorrt|continuous batch|dynamic batch|inference serv|throughput optimization)\b"),
    ("Pretraining & Scaling Laws", r"\b(scaling laws|chinchilla|compute[- ]optimal|pretrain|data mixing)\b"),
    ("Data Curation & Synthesis", r"\b(data curation|data synthesis|synthetic data|deduplication|semdedup|dataset distill)\b"),
    ("Evaluation & Benchmarking", r"\b(benchmark|evaluat|helm|big[- ]bench|mt[- ]bench|leaderboard|holistic evaluation)\b"),
    ("Mechanistic Interpretability", r"\b(mechanistic interpret|circuit analysis|sparse autoencoder|\bsae\b|feature attribution|probing classifier|activation steering)\b"),
    ("Agentic Orchestration & Tool Use", r"\b(agentic|multi[- ]agent|tool use|tool[- ]calling|autogen|orchestrat|agent loop|react)\b"),
    ("Robotics / Embodied Learning", r"\b(robot|embodied|manipulation|locomotion|vla |vision[- ]language[- ]action|sim[- ]to[- ]real)\b"),
    ("Multimodal / Vision-Language", r"\b(multimodal|vision[- ]language|\bvlm\b|clip|image[- ]text|visual instruction)\b"),
    ("Diffusion / Generative Models", r"\b(diffusion model|ddpm|score[- ]based|latent diffusion|flow matching|stable diffusion)\b"),
    ("Reinforcement Learning (Foundations)", r"\b(reinforcement learning|markov decision|q[- ]learning|actor[- ]critic|trpo|policy gradient)\b"),
    ("Distributed Training & Parallelism", r"\b(zero|fsdp|tensor parallel|pipeline parallel|data parallel|megatron|deepspeed)\b"),
]

VENUE_PATTERNS = [
    ("NeurIPS", r"\b(neurips|nips)\b"), ("ICML", r"\bicml\b"), ("ICLR", r"\biclr\b"),
    ("ACL", r"\b(acl |annual meeting of the association for computational linguistics)\b"),
    ("EMNLP", r"\bemnlp\b"), ("NAACL", r"\bnaacl\b"), ("CVPR", r"\bcvpr\b"),
    ("ICCV", r"\biccv\b"), ("ECCV", r"\beccv\b"), ("AAAI", r"\baaai\b"),
    ("IJCAI", r"\bijcai\b"), ("KDD", r"\b(kdd |sigkdd)\b"), ("SIGIR", r"\bsigir\b"),
    ("WWW", r"\b(www conference|the web conference)\b"), ("RSS", r"\b(rss |robotics: science and systems)\b"),
    ("CoRL", r"\bcorl\b"), ("ICRA", r"\bicra\b"), ("IROS", r"\biros\b"),
    ("OSDI", r"\bosdi\b"), ("SOSP", r"\bsosp\b"), ("NSDI", r"\bnsdi\b"),
    ("USENIX ATC", r"\busenix atc\b"), ("USENIX Security", r"\busenix security\b"),
    ("IEEE S&P / Oakland", r"\b(ieee s&p|ieee symposium on security|oakland)\b"),
    ("CCS", r"\b(acm ccs|ccs '?\d)\b"), ("CHI", r"\b(chi conference|chi '?\d)\b"),
    ("UIST", r"\buist\b"), ("VLDB", r"\bvldb\b"), ("SIGMOD", r"\bsigmod\b"),
    ("FAccT", r"\bfacct\b"), ("TMLR", r"\btmlr\b"), ("JMLR", r"\bjmlr\b"),
    ("Nature", r"\b(nature\b(?! communications)|nature\.)"), ("Science", r"\bscience\b(?! advances)"),
    ("PNAS", r"\bpnas\b"), ("RFC (IETF)", r"\brfc \d+\b"), ("arXiv", r"\b(arxiv|preprint)\b"),
    ("Anthropic Research", r"\b(anthropic\.com|anthropic research|transformer circuits)\b"),
    ("OpenAI Research", r"\bopenai\.com\b"), ("DeepMind / Google Research", r"\b(deepmind|google research|research\.google)\b"),
    ("Meta AI / FAIR", r"\b(meta ai|fair |facebook ai research)\b"), ("Microsoft Research", r"\bmicrosoft research\b"),
    ("GitHub / Documentation", r"\b(github\.com|github pages|readthedocs|docs\.\w+)\b"),
    ("Blog / Web Article", r"\b(blog|medium\.com|substack|dev\.to)\b"), ("Wikipedia", r"\bwikipedia\b"),
]

SIZE_PATTERNS = [
    (re.compile(r"\b(\d+\.\d+|\d{1,4})\s*B\b(?:\s*parameters|\s*params|\s*model)?", re.I), 1000),
    (re.compile(r"\b(\d{1,4})\s*M\b(?:\s*parameters|\s*params|\s*model)?", re.I), 1),
]

SIZE_TIERS = [
    ("<1B parameters", 0, 999),
    ("1-10B parameters", 1000, 9999),
    ("10-100B parameters", 10000, 99999),
    ("100B-1T parameters", 100000, 999999),
    ("1T+ parameters", 1000000, 10**12),
]

PIPELINE_STAGES = [
    ("1. Data Curation & Preparation", "Assembling, cleaning, and deduplicating pretraining and finetuning data.", ["REF-421", "REF-460", "REF-468", "REF-471", "REF-442"]),
    ("2. Tokenization & Architecture Foundations", "Tokenizer choice, architecture variants, and positional encodings.", ["REF-389", "REF-500"]),
    ("3. Pretraining at Scale", "Compute-optimal recipes, scaling laws, and large-scale optimization.", ["REF-052", "REF-054", "REF-389", "REF-437", "REF-460"]),
    ("4. Mixture-of-Experts & Sparse Architectures", "Sparsely activated models as a parallel pretraining strategy.", ["REF-007"]),
    ("5. Instruction Tuning & SFT", "Supervised fine-tuning on instructions to convert base models into assistants.", ["REF-055", "REF-435", "REF-470"]),
    ("6. RLHF, DPO, and Preference Optimization", "Aligning models with human and AI feedback.", ["REF-025", "REF-055", "REF-449"]),
    ("7. RLVR & Reasoning RL", "Verifiable-reward RL for reasoning, math, and code.", ["REF-819", "REF-957", "REF-457"]),
    ("8. PEFT / LoRA / Adapter-Based Adaptation", "Parameter-efficient fine-tuning when full SFT is impractical.", ["REF-049"]),
    ("9. Quantization, Pruning & Compression", "Shrinking trained models for inference deployment.", ["REF-051"]),
    ("10. Inference Serving & Optimization", "Productionizing trained models: batching, KV cache, throughput.", ["REF-101", "REF-102", "REF-312", "REF-313"]),
    ("11. Evaluation, Safety & Continuous Monitoring", "Holistic evaluation, red-teaming, and live monitoring.", ["REF-063", "REF-064", "REF-189", "REF-191", "REF-481"]),
]


@dataclass
class RefRecord:
    ref_id: str
    title: str
    path: Path
    text: str
    frontmatter: dict[str, Any] = field(default_factory=dict)
    citation: dict[str, Any] = field(default_factory=dict)
    year: int | None = None
    authors: list[str] = field(default_factory=list)
    affiliations: list[str] = field(default_factory=list)
    primary_affiliation: str | None = None
    venue: str | None = None
    topics: list[str] = field(default_factory=list)
    methods: list[str] = field(default_factory=list)
    size_tier: str | None = None
    params_m: float | None = None
    incoming: set[str] = field(default_factory=set)
    outgoing: set[str] = field(default_factory=set)


def parse_simple_yaml(text: str) -> dict[str, Any]:
    out: dict[str, Any] = {}
    current_key: str | None = None
    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.startswith("  - ") and current_key:
            out.setdefault(current_key, []).append(line[4:].strip().strip('"\''))
            continue
        match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if not match:
            continue
        key, value = match.groups()
        current_key = key
        value = value.strip()
        if value == "":
            out[key] = []
        elif value.startswith("[") and value.endswith("]"):
            out[key] = [v.strip().strip('"\'') for v in value[1:-1].split(",") if v.strip()]
        else:
            out[key] = value.strip('"\'')
    return out


def parse_frontmatter(text: str) -> dict[str, Any]:
    match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not match:
        return {}
    body = match.group(1)
    if yaml:
        try:
            loaded = yaml.safe_load(body)
            return loaded if isinstance(loaded, dict) else {}
        except Exception:
            return {}
    return parse_simple_yaml(body)


def load_config(root: Path) -> dict[str, Any]:
    path = root / ".aiwg" / "config.yaml"
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8", errors="replace")
    if yaml:
        loaded = yaml.safe_load(text)
        return loaded if isinstance(loaded, dict) else {}
    return parse_simple_yaml(text)


def ref_sort_key(ref_id: str) -> tuple[int, str]:
    match = re.match(r"REF-(\d+)([a-z]?)", ref_id)
    return (int(match.group(1)), match.group(2)) if match else (999999, ref_id)


def normalize_author(name: str) -> str:
    name = name.strip().strip(".").strip(",")
    if not name or "," in name:
        return name
    parts = name.split()
    return name if len(parts) == 1 else f"{parts[-1]}, {' '.join(parts[:-1])}"


def slug_to_title(value: str) -> str:
    return value.replace("-", " ").replace("_", " ").title()


def extract_ref_id(path: Path) -> str | None:
    match = REF_FILE_RE.match(path.name)
    return f"REF-{match.group(1)}" if match else None


def extract_title(text: str, fm: dict[str, Any]) -> str:
    if isinstance(fm.get("title"), str):
        return fm["title"].strip().strip('"')
    match = re.search(r"^# REF-[\w-]+[:\s]*(.+?)$", text, re.M)
    if match:
        return match.group(1).strip()
    match = re.search(r"^# (.+?)$", text, re.M)
    return match.group(1).strip() if match else "(untitled)"


def extract_year(text: str, fm: dict[str, Any], citation: dict[str, Any]) -> int | None:
    for source in (fm, citation):
        value = source.get("year")
        if value:
            try:
                return int(value)
            except Exception:
                pass
    cit = re.search(r"^## (?:1\.\s*)?Citation\s*\n+(.*?)(?:\n##|\Z)", text, re.M | re.S)
    haystack = cit.group(1) if cit else text[:4000]
    match = re.search(r"\((\d{4})\)", haystack) or YEAR_RE.search(haystack)
    if match:
        return int("".join(match.groups())) if len(match.groups()) == 2 else int(match.group(1))
    return None


def extract_authors(text: str, fm: dict[str, Any], citation: dict[str, Any]) -> list[str]:
    for source in (citation, fm):
        authors = source.get("authors")
        if isinstance(authors, list):
            names = []
            for author in authors:
                if isinstance(author, dict) and author.get("name"):
                    names.append(str(author["name"]).strip())
                elif isinstance(author, str):
                    names.append(author.strip())
            if names:
                return names
    cit = re.search(r"^## (?:1\.\s*)?Citation\s*\n+(.*?)(?:\n##|\Z)", text, re.M | re.S)
    if not cit:
        return []
    match = re.match(r"(.*?)\s*\(\d{4}\)", cit.group(1), re.S)
    if not match:
        return []
    parts = re.split(r",\s+&\s+|,\s+and\s+|\s+&\s+|\s+and\s+|,\s+(?=[A-Z])", match.group(1).strip().rstrip(","))
    return [p.strip().rstrip(",") for p in parts if p.strip() and len(p.strip()) < 100]


def extract_affiliations(citation: dict[str, Any]) -> tuple[list[str], str | None]:
    affiliations = []
    authors = citation.get("authors")
    if isinstance(authors, list):
        for author in authors:
            if isinstance(author, dict) and author.get("affiliation"):
                affiliations.append(str(author["affiliation"]).strip())
    primary = citation.get("affiliation-primary")
    if primary:
        affiliations.insert(0, str(primary).strip())
    deduped = list(dict.fromkeys(a for a in affiliations if a))
    return deduped, str(primary).strip() if primary else (deduped[0] if deduped else None)


def classify_first(text: str, patterns: list[tuple[str, str]]) -> str | None:
    for label, pattern in patterns:
        if re.search(pattern, text, re.I):
            return label
    return None


def classify_many(text: str, patterns: list[tuple[str, str]]) -> list[str]:
    return [label for label, pattern in patterns if re.search(pattern, text, re.I)]


def extract_params(text: str) -> tuple[str | None, float | None]:
    candidates = []
    for pattern, multiplier in SIZE_PATTERNS:
        for match in pattern.finditer(text[:6000]):
            try:
                value = float(match.group(1)) * multiplier
                if 0.1 <= value <= 10_000_000:
                    candidates.append(value)
            except Exception:
                continue
    if not candidates:
        return None, None
    params_m = max(candidates)
    for label, low, high in SIZE_TIERS:
        if low <= params_m <= high:
            return label, params_m
    return None, params_m


def parse_citation_edges(text: str) -> tuple[set[str], set[str]]:
    outgoing: set[str] = set()
    incoming: set[str] = set()
    section = None
    for line in text.splitlines():
        low = line.lower()
        if low.startswith("## outgoing") or "out-going" in low:
            section = "out"
            continue
        if low.startswith("## incoming"):
            section = "in"
            continue
        if line.startswith("## "):
            section = None
        if section and "|" in line:
            for ref in REF_ID_RE.findall(line):
                (outgoing if section == "out" else incoming).add(ref)
    return outgoing, incoming


def load_refs(root: Path) -> list[RefRecord]:
    refs_dir = root / "documentation" / "references"
    cites_dir = root / "documentation" / "citations"
    records: list[RefRecord] = []
    for path in sorted(refs_dir.glob("REF-*.md")):
        ref_id = extract_ref_id(path)
        if not ref_id:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        fm = parse_frontmatter(text)
        citation_path = cites_dir / f"{ref_id}-citations.md"
        citation: dict[str, Any] = {}
        incoming: set[str] = set()
        outgoing: set[str] = set()
        if citation_path.exists():
            citation_text = citation_path.read_text(encoding="utf-8", errors="replace")
            citation = parse_frontmatter(citation_text)
            outgoing, incoming = parse_citation_edges(citation_text)
        authors = extract_authors(text, fm, citation)
        affiliations, primary_affiliation = extract_affiliations(citation)
        topics = fm.get("topics") if isinstance(fm.get("topics"), list) else None
        haystack = text[:6000].lower()
        venue_raw = citation.get("venue") or fm.get("venue")
        venue = classify_first(f"{venue_raw or ''} {text[:3500]}".lower(), VENUE_PATTERNS) or (str(venue_raw).strip() if venue_raw else None)
        size_tier, params_m = extract_params(text)
        records.append(RefRecord(
            ref_id=ref_id,
            title=extract_title(text, fm),
            path=path,
            text=text,
            frontmatter=fm,
            citation=citation,
            year=extract_year(text, fm, citation),
            authors=authors,
            affiliations=affiliations,
            primary_affiliation=primary_affiliation,
            venue=venue,
            topics=[slug_to_title(str(t)) for t in topics] if topics else [classify_first(haystack, TOPIC_PATTERNS) or "Uncategorized"],
            methods=classify_many(haystack, METHOD_PATTERNS) or ["Uncategorized"],
            size_tier=size_tier,
            params_m=params_m,
            incoming=incoming,
            outgoing=outgoing,
        ))
    return records


def checksum_sources(root: Path) -> str:
    digest = hashlib.sha256()
    for base in (root / "documentation" / "references", root / "documentation" / "citations"):
        if not base.exists():
            continue
        for path in sorted(base.glob("REF-*.md")):
            digest.update(str(path.relative_to(root)).encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()


def header(title: str, generated: str, count: int, checksum: str) -> list[str]:
    return [
        f"# {title}",
        "",
        f"Generated: {generated}",
        f"Sources: {count} references",
        f"Source-Checksum: sha256:{checksum}",
        "",
    ]


def ref_link(record: RefRecord) -> str:
    return f"**{record.ref_id}** — {record.title}"


def render_grouped(title: str, records: list[RefRecord], groups: dict[str, list[RefRecord]], generated: str, checksum: str) -> str:
    lines = header(title, generated, len(records), checksum)
    for name in sorted(groups, key=lambda n: (n == "Uncategorized", -len(groups[n]), n.lower())):
        items = sorted(groups[name], key=lambda r: ref_sort_key(r.ref_id))
        lines += [f"## {name} ({len(items)} papers)", ""]
        lines += [f"- {ref_link(r)}" for r in items]
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_by_year(records: list[RefRecord], generated: str, checksum: str) -> str:
    groups: dict[str, list[RefRecord]] = defaultdict(list)
    for record in records:
        groups[str(record.year) if record.year else "Year Unknown"].append(record)
    lines = header("Index: Papers by Year", generated, len(records), checksum)
    years = sorted(groups, key=lambda y: (-1 if y == "Year Unknown" else -int(y), y))
    for year in years:
        items = sorted(groups[year], key=lambda r: ref_sort_key(r.ref_id))
        lines += [f"## {year} ({len(items)} papers)", ""]
        lines += [f"- {ref_link(r)}" for r in items]
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_authors(records: list[RefRecord], generated: str, checksum: str) -> str:
    groups: dict[str, list[RefRecord]] = defaultdict(list)
    for record in records:
        for author in record.authors or ["(no authors listed)"]:
            groups[normalize_author(author)].append(record)
    lines = header("Index: Papers by Author", generated, len(records), checksum)
    lines += ["Sorted alphabetically by normalized author name.", ""]
    for author in sorted(groups, key=lambda a: a.lower()):
        items = sorted(groups[author], key=lambda r: ref_sort_key(r.ref_id))
        if len(items) == 1:
            lines.append(f"- **{author}** — {items[0].ref_id}: {items[0].title}")
        else:
            lines.append(f"- **{author}** ({len(items)} papers)")
            lines += [f"  - {r.ref_id}: {r.title}" for r in items]
    return "\n".join(lines).rstrip() + "\n"


def render_entity_authors(records: list[RefRecord], generated: str, checksum: str) -> str:
    corpus_root = records[0].path.parents[2] if records else None
    profiles = {p.stem.replace("PROF-P-", "") for p in (corpus_root / "documentation" / "profiles" / "people").glob("PROF-P-*.md")} if corpus_root else set()
    counts: dict[str, list[RefRecord]] = defaultdict(list)
    for record in records:
        for author in record.authors or ["(no authors listed)"]:
            counts[normalize_author(author)].append(record)
    lines = header("Authors Index (Enriched)", generated, len(records), checksum)
    lines += ["| Author | Papers | Top Hub Authored | Profile | REFs |", "|---|---:|---|---|---|"]
    for author, items in sorted(counts.items(), key=lambda kv: (-len(kv[1]), kv[0].lower())):
        refs = sorted({r.ref_id for r in items}, key=ref_sort_key)
        top = max(items, key=lambda r: len(r.incoming), default=None)
        slug = re.sub(r"[^a-z0-9]+", "-", author.lower()).strip("-").replace("- ", "-")
        profile = f"[PROF-P-{slug}](../documentation/profiles/people/PROF-P-{slug}.md)" if slug in profiles else "-"
        lines.append(f"| {author} | {len(refs)} | {top.ref_id if top else '-'} ({len(top.incoming) if top else 0}) | {profile} | {', '.join(refs[:12])}{'...' if len(refs) > 12 else ''} |")
    return "\n".join(lines) + "\n"


def render_orgs(records: list[RefRecord], generated: str, checksum: str) -> str:
    groups: dict[str, list[RefRecord]] = defaultdict(list)
    authors: dict[str, Counter[str]] = defaultdict(Counter)
    for record in records:
        org = record.primary_affiliation or "(no affiliation listed)"
        groups[org].append(record)
        for author in record.authors[:3]:
            authors[org][normalize_author(author)] += 1
    lines = header("Affiliations Index", generated, len(records), checksum)
    lines += ["| Affiliation | Papers | Top Authors | REFs |", "|---|---:|---|---|"]
    for org, items in sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0].lower())):
        refs = sorted({r.ref_id for r in items}, key=ref_sort_key)
        top_authors = ", ".join(a for a, _ in authors[org].most_common(3)) or "-"
        lines.append(f"| {org} | {len(refs)} | {top_authors} | {', '.join(refs[:12])}{'...' if len(refs) > 12 else ''} |")
    return "\n".join(lines) + "\n"


def render_bridges(records: list[RefRecord], generated: str, checksum: str) -> str:
    author_orgs: dict[str, set[str]] = defaultdict(set)
    author_refs: dict[str, set[str]] = defaultdict(set)
    for record in records:
        for author in record.authors:
            norm = normalize_author(author)
            if record.primary_affiliation:
                author_orgs[norm].add(record.primary_affiliation)
            author_refs[norm].add(record.ref_id)
    lines = header("Bridge Authors", generated, len(records), checksum)
    lines += ["Authors whose corpus papers span two or more distinct affiliations.", "", "| Author | Affiliations | Papers | REFs |", "|---|---:|---:|---|"]
    rows = [(a, orgs, author_refs[a]) for a, orgs in author_orgs.items() if len(orgs) >= 2]
    for author, orgs, refs in sorted(rows, key=lambda row: (-len(row[1]), -len(row[2]), row[0].lower())):
        sorted_refs = sorted(refs, key=ref_sort_key)
        lines.append(f"| {author} | {len(orgs)} | {len(refs)} | {', '.join(sorted_refs[:12])}{'...' if len(sorted_refs) > 12 else ''} |")
    return "\n".join(lines) + "\n"


def render_unprofiled_hubs(records: list[RefRecord], generated: str, checksum: str) -> str:
    corpus_root = records[0].path.parents[2] if records else None
    profile_slugs = {p.stem.replace("PROF-P-", "") for p in (corpus_root / "documentation" / "profiles" / "people").glob("PROF-P-*.md")} if corpus_root else set()
    lines = header("Unprofiled Top Hubs", generated, len(records), checksum)
    lines += ["Top in-degree REFs whose primary author does not appear to have a PROF-P profile.", "", "| REF | In-deg | Primary Author | Title |", "|---|---:|---|---|"]
    emitted = 0
    for record in sorted(records, key=lambda r: (-len(r.incoming), ref_sort_key(r.ref_id))):
        if not record.authors:
            continue
        author = normalize_author(record.authors[0])
        slug = re.sub(r"[^a-z0-9]+", "-", author.lower()).strip("-")
        if slug in profile_slugs:
            continue
        lines.append(f"| {record.ref_id} | {len(record.incoming)} | {author} | {record.title[:80]} |")
        emitted += 1
        if emitted >= 50:
            break
    return "\n".join(lines) + "\n"


def render_citation_network(records: list[RefRecord], generated: str, checksum: str) -> str:
    nodes = len(records)
    edges = sum(len(r.outgoing) for r in records)
    lines = header("Citation Network", generated, nodes, checksum)
    density = edges / (nodes * (nodes - 1)) if nodes > 1 else 0
    lines += [f"Nodes: {nodes} | Edges: {edges} | Density: {density:.4f}", "", "## Top Hubs", "", "| REF | Title | In | Out | Total |", "|---|---|---:|---:|---:|"]
    for record in sorted(records, key=lambda r: (-(len(r.incoming) + len(r.outgoing)), ref_sort_key(r.ref_id)))[:25]:
        lines.append(f"| {record.ref_id} | {record.title[:80]} | {len(record.incoming)} | {len(record.outgoing)} | {len(record.incoming) + len(record.outgoing)} |")
    isolated = [r for r in records if not r.incoming and not r.outgoing]
    lines += ["", f"## Isolated Nodes ({len(isolated)})", "", "| REF | Title |", "|---|---|"]
    for record in sorted(isolated, key=lambda r: ref_sort_key(r.ref_id))[:200]:
        lines.append(f"| {record.ref_id} | {record.title[:100]} |")
    return "\n".join(lines) + "\n"


def render_model_size(records: list[RefRecord], generated: str, checksum: str) -> str:
    groups: dict[str, list[RefRecord]] = defaultdict(list)
    for record in records:
        groups[record.size_tier or "Not Applicable / No Extractable Size"].append(record)
    lines = header("Index: Papers by Model Size", generated, len(records), checksum)
    for tier in [t[0] for t in SIZE_TIERS] + ["Not Applicable / No Extractable Size"]:
        if tier not in groups:
            continue
        lines += [f"## {tier} ({len(groups[tier])} papers)", ""]
        for record in sorted(groups[tier], key=lambda r: (-(r.params_m or 0), ref_sort_key(r.ref_id))):
            size = f" [{record.params_m / 1000:.1f}B]" if record.params_m and record.params_m >= 1000 else (f" [{record.params_m:.0f}M]" if record.params_m else "")
            lines.append(f"- **{record.ref_id}**{size} — {record.title}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_pipeline(records: list[RefRecord], generated: str, checksum: str) -> str:
    available = {r.ref_id for r in records}
    lines = header("Index: Training Pipeline Reading Order", generated, len(records), checksum)
    lines += ["Stages move from data preparation through training, alignment, deployment, and monitoring.", ""]
    for title, blurb, refs in PIPELINE_STAGES:
        lines += [f"## {title}", "", f"_{blurb}_", ""]
        for ref in refs:
            suffix = "" if ref in available else " (not in corpus)"
            lines.append(f"- **{ref}{suffix}**")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def output_for_graph(name: str, config_entry: dict[str, Any] | None) -> Path:
    if config_entry and config_entry.get("output"):
        return Path(str(config_entry["output"]))
    return Path("indices") / f"{name}.md"


def build_graph(name: str, records: list[RefRecord], generated: str, checksum: str) -> str:
    if name == "by-year":
        return render_by_year(records, generated, checksum)
    if name == "by-topic":
        groups: dict[str, list[RefRecord]] = defaultdict(list)
        for record in records:
            for topic in record.topics:
                groups[topic].append(record)
        return render_grouped("Index: Papers by Topic", records, groups, generated, checksum)
    if name == "authors":
        return render_authors(records, generated, checksum)
    if name == "by-venue":
        groups: dict[str, list[RefRecord]] = defaultdict(list)
        for record in records:
            groups[record.venue or "Unmatched"].append(record)
        return render_grouped("Index: Papers by Venue", records, groups, generated, checksum)
    if name == "by-method":
        groups: dict[str, list[RefRecord]] = defaultdict(list)
        for record in records:
            for method in record.methods:
                groups[method].append(record)
        return render_grouped("Index: Papers by Method", records, groups, generated, checksum)
    if name == "by-model-size":
        return render_model_size(records, generated, checksum)
    if name == "training-pipeline":
        return render_pipeline(records, generated, checksum)
    if name == "citation-network":
        return render_citation_network(records, generated, checksum)
    if name == "by-author":
        return render_entity_authors(records, generated, checksum)
    if name == "by-org":
        return render_orgs(records, generated, checksum)
    if name == "by-bridge":
        return render_bridges(records, generated, checksum)
    if name == "unprofiled-hubs":
        return render_unprofiled_hubs(records, generated, checksum)
    raise ValueError(f"unsupported graph: {name}")


def configured_graphs(config: dict[str, Any]) -> dict[str, dict[str, Any]]:
    index_graphs = ((config.get("index") or {}).get("graphs") or {})
    manifest = (((index_graphs.get("indices") or {}).get("manifest")) or [])
    graphs: dict[str, dict[str, Any]] = {}
    if isinstance(manifest, list):
        for entry in manifest:
            if isinstance(entry, dict) and entry.get("name"):
                graphs[str(entry["name"])] = entry
    if not graphs:
        for name in ["by-topic", "by-year", "authors", "by-venue", "by-method", "training-pipeline", "by-model-size"]:
            graphs[name] = {"name": name}
    if "citation-network" in index_graphs:
        graphs.setdefault("citation-network", {"name": "citation-network"})
    return graphs


def existing_checksum(path: Path) -> str | None:
    if not path.exists():
        return None
    match = re.search(r"^Source-Checksum:\s*sha256:([a-f0-9]{64})\s*$", path.read_text(encoding="utf-8", errors="replace"), re.M)
    return match.group(1) if match else None


def main() -> int:
    parser = argparse.ArgumentParser(description="Build research corpus markdown indices")
    parser.add_argument("--graph", help="Build a single named graph")
    parser.add_argument("--all", action="store_true", help="Build all configured graphs")
    parser.add_argument("--force", action="store_true", help="Rewrite even when source checksum is unchanged")
    parser.add_argument("--format", choices=["full", "summary", "json"], default="full")
    parser.add_argument("--corpus-root", default=".", help="Research corpus root")
    args = parser.parse_args()

    root = Path(args.corpus_root).resolve()
    config = load_config(root)
    graphs = configured_graphs(config)
    selected = [args.graph] if args.graph else list(graphs)
    if args.graph and args.graph not in graphs:
        print(f"Unknown graph: {args.graph}", file=sys.stderr)
        return 2

    records = load_refs(root)
    checksum = checksum_sources(root)
    generated = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    results = []

    for name in selected:
        out_rel = output_for_graph(name, graphs.get(name))
        out_path = root / out_rel
        if not args.force and existing_checksum(out_path) == checksum:
            results.append({"graph": name, "status": "skipped", "output": str(out_rel), "papers": len(records)})
            continue
        try:
            content = build_graph(name, records, generated, checksum)
        except ValueError as err:
            results.append({"graph": name, "status": "unsupported", "error": str(err), "output": str(out_rel)})
            continue
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(content, encoding="utf-8")
        results.append({"graph": name, "status": "built", "output": str(out_rel), "papers": len(records)})

    if args.format == "json":
        print(json.dumps({"corpusRoot": str(root), "results": results}, indent=2))
    else:
        built = sum(1 for r in results if r["status"] == "built")
        skipped = sum(1 for r in results if r["status"] == "skipped")
        unsupported = sum(1 for r in results if r["status"] == "unsupported")
        print("Corpus Index Build")
        print(f"Graphs built: {built} | skipped: {skipped} | unsupported: {unsupported}")
        if args.format == "full":
            for result in results:
                extra = f" ({result.get('error')})" if result["status"] == "unsupported" else ""
                print(f"  {result['graph']}: {result['status']} -> {result['output']}{extra}")

    return 1 if any(r["status"] == "unsupported" for r in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
