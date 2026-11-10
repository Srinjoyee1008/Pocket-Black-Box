"""Small deterministic, offline triage heuristic; suggestions always need human review."""

from dataclasses import dataclass
import re

from app.models import Urgency


@dataclass(frozen=True)
class TriageResult:
    urgency: Urgency
    needs: list[str]
    confidence: float
    model_status: str = "heuristic"


NEED_TERMS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("medical", ("injury", "injured", "bleeding", "fever", "medicine", "medication", "medical", "sick",
                 "আহত", "রক্তপাত", "জ্বর", "ওষুধ", "চিকিৎসা", "অসুস্থ")),
    ("water", ("water", "thirst", "drinking", "জল", "পানি", "তৃষ্ণা")),
    ("food", ("food", "hungry", "meal", "খাবার", "খাদ্য", "ক্ষুধা")),
    ("shelter", ("shelter", "roof", "tent", "displaced", "আশ্রয়", "ছাদ", "তাঁবু")),
    ("rescue", ("trapped", "rescue", "missing", "cannot reach", "can't reach",
                "আটকে", "উদ্ধার", "নিখোঁজ")),
    ("access", ("blocked", "blocking", "road", "path", "tree", "রাস্তা", "অবরুদ্ধ")),
)
HIGH_TERMS = (
    "urgent", "critical", "life-threatening", "unconscious", "severe", "trapped", "bleeding",
    "জরুরি", "সংকটজনক", "অচেতন", "গুরুতর", "রক্তপাত",
)


def _contains(normalized: str, term: str) -> bool:
    if any(ord(character) > 127 for character in term):
        return term in normalized
    return re.search(rf"\b{re.escape(term)}\b", normalized) is not None


def classify(text: str) -> TriageResult:
    normalized = re.sub(r"\s+", " ", text.casefold())
    needs = [
        label
        for label, terms in NEED_TERMS
        if any(_contains(normalized, term) for term in terms)
    ]
    high = any(_contains(normalized, term) for term in HIGH_TERMS)
    urgency = Urgency.high if high else (Urgency.medium if needs else Urgency.low)
    # This is deliberately marked heuristic and never represented as a diagnosis.
    confidence = 0.68 if high else (0.58 if needs else 0.42)
    return TriageResult(urgency=urgency, needs=needs, confidence=confidence)
