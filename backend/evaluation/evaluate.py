"""RAG evaluation script — measures retrieval accuracy and answer quality.

Runs queries from the test dataset against the running system
and evaluates retrieval relevance and answer coverage.

Usage:
    cd backend
    uv run python -m evaluation.evaluate --base-url http://localhost:8000
"""

import argparse
import json
import sys
from pathlib import Path

import httpx

DATASET_PATH = Path(__file__).parent / "test_dataset.json"


def load_dataset() -> list[dict]:
    """Load test dataset from JSON file."""
    with open(DATASET_PATH) as f:
        return json.load(f)


def evaluate_query(base_url: str, test_case: dict) -> dict:
    """Run a single evaluation query and score the result."""
    try:
        response = httpx.post(
            f"{base_url}/query",
            json={
                "query": test_case["query"],
                "mode": "agent" if test_case.get("requires_tool") else "rag",
            },
            timeout=60.0,
        )
        response.raise_for_status()
        result = response.json()

        scores = {
            "id": test_case["id"],
            "query": test_case["query"],
            "language_correct": result.get("language") == test_case.get("language"),
            "has_answer": bool(result.get("answer")),
        }

        # Check topic coverage
        answer_lower = result.get("answer", "").lower()
        topics = test_case.get("expected_topics", [])
        matched = sum(1 for t in topics if t.lower() in answer_lower)
        scores["topic_coverage"] = matched / len(topics) if topics else 1.0

        # Check expected answer content
        expected_contains = test_case.get("expected_answer_contains")
        if expected_contains:
            scores["answer_contains_expected"] = expected_contains in result.get("answer", "")

        # Check if correct tool was used
        required_tool = test_case.get("requires_tool")
        if required_tool:
            tool_names = [tr.get("tool") for tr in result.get("tool_results", [])]
            scores["correct_tool_used"] = required_tool in tool_names

        # Check source relevance
        expected_source = test_case.get("expected_source")
        if expected_source:
            sources = [s.get("source", "") for s in result.get("sources", [])]
            scores["correct_source"] = any(expected_source in s for s in sources)

        scores["status"] = "pass"
        return scores

    except Exception as e:
        return {
            "id": test_case["id"],
            "query": test_case["query"],
            "status": "error",
            "error": str(e),
        }


def run_evaluation(base_url: str) -> None:
    """Run the full evaluation suite and print results."""
    dataset = load_dataset()
    print(f"\n{'='*60}")
    print(f"Running evaluation: {len(dataset)} test cases")
    print(f"Target: {base_url}")
    print(f"{'='*60}\n")

    results = []
    for case in dataset:
        print(f"  [{case['id']}] {case['query'][:60]}...", end=" ")
        result = evaluate_query(base_url, case)
        results.append(result)
        status_icon = "✅" if result["status"] == "pass" else "❌"
        print(status_icon)

    # Summary
    passed = sum(1 for r in results if r["status"] == "pass")
    print(f"\n{'='*60}")
    print(f"Results: {passed}/{len(results)} queries succeeded")

    # Average topic coverage
    coverages = [r.get("topic_coverage", 0) for r in results if "topic_coverage" in r]
    if coverages:
        avg_coverage = sum(coverages) / len(coverages)
        print(f"Average topic coverage: {avg_coverage:.1%}")

    lang_correct = sum(1 for r in results if r.get("language_correct"))
    print(f"Language detection accuracy: {lang_correct}/{len(results)}")
    print(f"{'='*60}\n")

    # Write detailed results
    output_path = Path(__file__).parent / "evaluation_results.json"
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Detailed results written to {output_path}")


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="RAG Evaluation Script")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Base URL of the backend API",
    )
    args = parser.parse_args()
    run_evaluation(args.base_url)


if __name__ == "__main__":
    main()
