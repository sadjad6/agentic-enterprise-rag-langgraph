import pytest
from app.agent.tools import calculator

def test_calculator_tool_happy_path():
    """Test successful arithmetic evaluation."""
    res = calculator.invoke("sqrt(144) + 15 * 3")
    assert "57.0" in res

def test_calculator_tool_unhappy_path_syntax_error():
    """Test edge case where user provides invalid syntax."""
    res = calculator.invoke("15 * +")
    assert "invalid syntax" in res

def test_calculator_tool_unhappy_path_unsafe_exec():
    """Test edge case where user provides unsafe string."""
    res = calculator.invoke("__import__('os').system('ls')")
    assert "is not defined" in res
