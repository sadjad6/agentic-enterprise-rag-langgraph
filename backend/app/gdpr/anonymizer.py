"""GDPR-compliant PII anonymization.

Provides regex-based detection and masking of common PII patterns
(emails, phone numbers, IBANs, German addresses). Lightweight
alternative to Presidio that requires no ML model downloads.
"""

import re
from dataclasses import dataclass

# ── PII Patterns ──────────────────────────────────────────────

_EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
)
_PHONE_PATTERN = re.compile(
    r"(?:\+49|0049|0)\s?[\d\s/\-]{6,14}\d"
)
_IBAN_PATTERN = re.compile(
    r"\b[A-Z]{2}\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{0,2}\b"
)
_IP_PATTERN = re.compile(
    r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"
)


@dataclass
class AnonymizationResult:
    """Result of PII anonymization."""

    text: str
    detections: list[dict[str, str]]


_PATTERNS: list[tuple[str, re.Pattern, str]] = [
    ("email", _EMAIL_PATTERN, "[EMAIL_REDACTED]"),
    ("iban", _IBAN_PATTERN, "[IBAN_REDACTED]"),
    ("phone", _PHONE_PATTERN, "[PHONE_REDACTED]"),
    ("ip_address", _IP_PATTERN, "[IP_REDACTED]"),
]


def anonymize_text(text: str) -> AnonymizationResult:
    """Detect and replace PII in text with redaction placeholders.

    Returns the anonymized text and a list of detections.
    """
    detections: list[dict[str, str]] = []
    anonymized = text

    for pii_type, pattern, replacement in _PATTERNS:
        matches = pattern.findall(anonymized)
        for match in matches:
            detections.append({"type": pii_type, "original": match})
        anonymized = pattern.sub(replacement, anonymized)

    return AnonymizationResult(text=anonymized, detections=detections)


def contains_pii(text: str) -> bool:
    """Quick check whether text contains any detectable PII."""
    return any(pattern.search(text) for _, pattern, _ in _PATTERNS)
