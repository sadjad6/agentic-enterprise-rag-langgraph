"""Tests for the GDPR anonymizer module."""

from app.gdpr.anonymizer import anonymize_text, contains_pii


class TestAnonymizer:
    """Unit tests for PII anonymization."""

    def test_anonymize_email(self) -> None:
        """Email addresses should be redacted."""
        result = anonymize_text("Contact me at john.doe@example.com for details.")
        assert "[EMAIL_REDACTED]" in result.text
        assert "john.doe@example.com" not in result.text
        assert len(result.detections) == 1
        assert result.detections[0]["type"] == "email"

    def test_anonymize_phone_german(self) -> None:
        """German phone numbers should be redacted."""
        result = anonymize_text("Rufen Sie mich an: +49 170 1234567")
        assert "[PHONE_REDACTED]" in result.text
        assert "1234567" not in result.text

    def test_anonymize_iban(self) -> None:
        """IBAN numbers should be redacted."""
        result = anonymize_text("IBAN: DE89 3704 0044 0532 0130 00")
        assert "[IBAN_REDACTED]" in result.text

    def test_anonymize_ip(self) -> None:
        """IP addresses should be redacted."""
        result = anonymize_text("Server at 192.168.1.100 is down.")
        assert "[IP_REDACTED]" in result.text

    def test_anonymize_multiple_pii(self) -> None:
        """Multiple PII types in one text should all be redacted."""
        text = "Email: test@test.de, IP: 10.0.0.1"
        result = anonymize_text(text)
        assert "[EMAIL_REDACTED]" in result.text
        assert "[IP_REDACTED]" in result.text
        assert len(result.detections) >= 2

    def test_no_pii(self) -> None:
        """Text without PII should remain unchanged."""
        text = "This is a normal sentence about business strategy."
        result = anonymize_text(text)
        assert result.text == text
        assert len(result.detections) == 0

    def test_contains_pii_true(self) -> None:
        """contains_pii should detect PII presence."""
        assert contains_pii("Contact john@example.com") is True
        assert contains_pii("Server 192.168.0.1") is True

    def test_contains_pii_false(self) -> None:
        """contains_pii should return False for clean text."""
        assert contains_pii("No personal data here") is False
