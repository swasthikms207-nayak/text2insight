import ast
import re
from dataclasses import dataclass
from typing import Tuple, List, Optional, Set
import pandas as pd
from ..models import SafetyResult

# Dangerous SQL keywords and commands that must never be permitted
FORBIDDEN_SQL_PATTERNS = [
    r"\b(DROP|TRUNCATE|DELETE|UPDATE|INSERT|ALTER|CREATE|REPLACE|MERGE|UPSERT)\b",
    r"\b(GRANT|REVOKE|COMMIT|ROLLBACK|SAVEPOINT)\b",
    r"\b(EXEC|EXECUTE|CALL|VACUUM|PRAGMA|REINDEX)\b",
    r"\b(COPY\s+.*\s+TO)\b",
    r"\b(INSTALL|LOAD)\b",
    r"\b(ATTACH|DETACH)\b",
    r"\bINTO\s+OUTFILE\b",
    r"\bINTO\s+DUMPFILE\b",
    r"\bpg_sleep\b",
    r"\bxp_cmdshell\b",
]

# Prohibited Python / Pandas functions, attributes and builtins
FORBIDDEN_PYTHON_NAMES = {
    "__import__", "eval", "exec", "compile", "open", "input",
    "globals", "locals", "vars", "dir", "getattr", "setattr", "delattr",
    "os", "sys", "subprocess", "socket", "urllib", "requests", "httpx",
    "shutil", "pathlib", "builtins", "__builtins__", "breakpoint",
    "exit", "quit", "reload"
}

FORBIDDEN_PANDAS_METHODS = {
    "to_csv", "to_excel", "to_sql", "to_parquet", "to_feather",
    "to_pickle", "to_json", "to_stata", "to_clipboard"
}

def clean_code_block(code_str: str, language: str = "") -> str:
    """Strips markdown code fences and unnecessary wrapping."""
    code = code_str.strip()
    if code.startswith("```"):
        lines = code.split("\n")
        # Remove first fence
        if lines[0].startswith("```"):
            lines = lines[1:]
        # Remove trailing fence
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        code = "\n".join(lines).strip()
    return code


@dataclass
class PromptValidationResult:
    is_valid: bool
    rule_violated: Optional[str] = None
    message: Optional[str] = None
    clarification: Optional[str] = None
    sanitized_prompt: str = ""


# Common valid short analytical abbreviations and terms
ALLOWED_SHORT_TERMS = {
    "id", "by", "to", "in", "on", "at", "is", "of", "or", "an", "as", "no", "yr", "mo",
    "avg", "sum", "max", "min", "std", "pct", "qty", "num", "cnt", "top", "sql", "csv", "df"
}

# Generic words that should not be mistaken for missing columns
GENERIC_ANALYTICS_WORDS = {
    "the", "a", "an", "all", "each", "every", "data", "dataset", "table", "records",
    "rows", "column", "columns", "items", "values", "results", "count", "number",
    "total", "value", "trend", "distribution", "summary", "top", "bottom", "first",
    "last", "highest", "lowest", "most", "least", "more", "less", "it", "them",
    "this", "that", "these", "those", "here", "there", "group", "category",
    "rate", "percentage", "ratio", "score", "amount", "level", "average", "avg",
    "sum", "mean", "median", "minimum", "maximum", "chart", "graph", "plot"
}


def validate_user_prompt(question: str, df: Optional[pd.DataFrame] = None) -> PromptValidationResult:
    """
    Applies 9 strict rules to detect and reject invalid user prompts before sending to LLM:
    1. Empty or too short (< 3 chars)
    2. Too long (> 500 chars)
    3. Gibberish (no real words, keyboard mash, pure symbols/numbers)
    4. Modification requests (delete, drop, update, insert, alter, truncate)
    5. System or file access (run commands, open files, network, imports)
    6. Prompt injection (ignore instructions, reveal prompt, act as something else)
    7. Off-topic (jokes, general chat, general programming help)
    8. Missing data (requests column or table not in schema, lists available columns)
    9. Ambiguous (too vague, asks one clarifying question)
    """
    trimmed = question.strip() if question else ""

    # Rule 1: Empty or too short (< 3 characters)
    if len(trimmed) < 3:
        return PromptValidationResult(
            is_valid=False,
            rule_violated="Empty or too short",
            message="Question is too short. Please provide a question with at least 3 characters."
        )

    # Rule 2: Too long (> 500 characters)
    if len(trimmed) > 500:
        return PromptValidationResult(
            is_valid=False,
            rule_violated="Too long",
            message="Question is too long (maximum 500 characters allowed)."
        )

    lower_prompt = trimmed.lower()

    # Rule 3: Gibberish (pure symbols/digits, keyboard mash, repetitive characters, or no real words)
    # 3a. Only symbols or numbers without alphabetic characters
    if not re.search(r"[a-zA-Z]", trimmed):
        return PromptValidationResult(
            is_valid=False,
            rule_violated="Gibberish",
            message="Question contains no recognizable words (only symbols or numbers)."
        )

    # 3b. Keyboard mash / sequential row spam
    KEYBOARD_MASH_PATTERNS = [
        r"asdfgh", r"asdfg", r"ghjkl", r"qwerty", r"zxcvb", r"lkjhg",
        r"poiuy", r"mnbvc", r"12345", r"asdfasdf", r"qweqwe", r"zxcvzxcv"
    ]
    for pat in KEYBOARD_MASH_PATTERNS:
        if re.search(pat, lower_prompt):
            return PromptValidationResult(
                is_valid=False,
                rule_violated="Gibberish",
                message=f"Question appears to be keyboard gibberish ('{pat}'). Please ask a meaningful data question."
            )

    # 3c. Repetitive characters (same letter repeated 5+ times)
    if re.search(r"([a-zA-Z])\1{4,}", trimmed):
        return PromptValidationResult(
            is_valid=False,
            rule_violated="Gibberish",
            message="Question appears to be gibberish with repetitive characters. Please ask a clear analytical question."
        )

    # 3d. Check for unpronounceable consonant clusters (words >= 4 chars without any vowels)
    alpha_tokens = re.findall(r"[a-zA-Z]+", lower_prompt)
    schema_cols_lower = [c.lower() for c in df.columns] if df is not None else []
    for token in alpha_tokens:
        if len(token) >= 4 and not re.search(r"[aeiouy]", token):
            if token not in schema_cols_lower and token not in ALLOWED_SHORT_TERMS:
                return PromptValidationResult(
                    is_valid=False,
                    rule_violated="Gibberish",
                    message=f"Question contains unrecognized or gibberish sequence '{token}'. Please use real words."
                )

    # 3e. Must contain at least one vowel-bearing word or valid schema/analytical term
    has_real_word = any(
        re.search(r"[aeiouy]", t) or t in schema_cols_lower or t in ALLOWED_SHORT_TERMS
        for t in alpha_tokens
    )
    if not has_real_word:
        return PromptValidationResult(
            is_valid=False,
            rule_violated="Gibberish",
            message="Question appears to be gibberish with no recognizable words."
        )

    # Rule 4: Modification requests (delete, drop, update, insert, alter, truncate)
    MODIFICATION_PATTERNS = [
        r"\b(?:delete|drop|update|insert|alter|truncate)\s+(?:from|table|database|columns?|rows?|records?|the\s+data|all\s+data)\b",
        r"\b(?:modify|overwrite|purge|wipe)\s+(?:the\s+)?(?:data|table|database|columns?|rows?)\b",
        r"^\s*(?:delete|drop|truncate|alter|insert)\b",
        r"\b(?:drop\s+table|delete\s+from|insert\s+into|alter\s+table|truncate\s+table)\b",
        r"\b(?:delete|drop|truncate|alter|insert)\s+all\b"
    ]
    for pat in MODIFICATION_PATTERNS:
        if re.search(pat, lower_prompt):
            return PromptValidationResult(
                is_valid=False,
                rule_violated="Modification requests",
                message="Data modification requests (delete, drop, update, insert, alter, truncate) are not permitted. Only read-only analytical queries are supported."
            )

    # Rule 5: System or file access (run commands, open files, network, import modules)
    SYSTEM_ACCESS_PATTERNS = [
        r"\b(?:run|execute)\s+(?:a\s+)?(?:command|bash|shell|terminal|cmd|powershell|script|process)\b",
        r"\b(?:open|read|write|delete)\s+(?:a\s+)?(?:local\s+)?(?:file|filesystem|disk|folder|directory)\b",
        r"\b(?:access|use)\s+(?:the\s+)?(?:filesystem|network|internet)\b",
        r"\b(?:send|make)\s+(?:an?\s+)?(?:http|network|post|get|curl|socket)\s+request\b",
        r"\bimport\s+(?:module|os|sys|subprocess|shutil|pathlib|socket|urllib|requests|builtins)\b",
        r"\b(?:curl|wget|ping)\s+https?://",
        r"\b(?:cat|rm|ls)\s+/(?:etc|var|usr|bin|home)\b",
        r"\b(?:cmd\.exe|powershell\.exe|/bin/sh|/bin/bash)\b",
        r"\bexec\(|\beval\(|\b__import__\b"
    ]
    for pat in SYSTEM_ACCESS_PATTERNS:
        if re.search(pat, lower_prompt):
            return PromptValidationResult(
                is_valid=False,
                rule_violated="System or file access",
                message="System or file access requests (running commands, opening files, network requests, importing modules) are strictly prohibited."
            )

    # Rule 6: Prompt injection (ignore instructions, reveal prompt, act as something else)
    INJECTION_PATTERNS = [
        r"ignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|rules|prompts|directions)",
        r"disregard\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|rules|prompts|directions)",
        r"(?:reveal|show|print|display|tell\s+me)\s+(?:your|the)\s+(?:system\s+)?(?:prompt|instructions|rules|preprompt)",
        r"what\s+is\s+your\s+(?:system\s+)?prompt",
        r"act\s+as\s+(?:something\s+else|dan\b|an?\s+unrestricted|a\s+hacker|root|admin|jailbreak)",
        r"you\s+are\s+now\s+(?:in\s+)?(?:developer\s+mode|dan\b|jailbroken|unrestricted)",
        r"bypass\s+(?:all\s+)?(?:safety|guardrails|filters|rules|restrictions)",
        r"(?:forget|reset)\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions|context)"
    ]
    for pat in INJECTION_PATTERNS:
        if re.search(pat, lower_prompt):
            return PromptValidationResult(
                is_valid=False,
                rule_violated="Prompt injection",
                message="Prompt injection detected. Directives attempting to override instructions, reveal system prompts, or act as other personas are blocked."
            )

    # Rule 7: Off-topic (jokes, general chat, general coding help)
    JOKE_OR_CREATIVE_PATTERNS = [
        r"\b(?:tell\s+(?:me\s+)?(?:a\s+)?joke|make\s+me\s+laugh)\b",
        r"\b(?:write\s+(?:a\s+)?(?:joke|poem|story|song|essay|haiku|riddle|novel))\b",
    ]
    CHITCHAT_PATTERNS = [
        r"^\s*(?:hi|hello|hey|howdy|sup|greetings|good\s+(?:morning|afternoon|evening))[.?!]*\s*$",
        r"^\s*(?:how\s+are\s+you|who\s+are\s+you|what\s+is\s+your\s+name|who\s+created\s+you|what\s+can\s+you\s+do|how\'?s\s+the\s+weather)[.?!]*\s*$",
        r"^\s*(?:tell\s+me\s+about\s+yourself|are\s+you\s+an\s+ai|are\s+you\s+human)[.?!]*\s*$"
    ]
    GENERAL_CODING_PATTERNS = [
        r"\b(?:how\s+to|how\s+do\s+i)\s+(?:center\s+a\s+div|build\s+a\s+website|install\s+linux|hack|create\s+a\s+react\s+app)\b",
        r"\b(?:write|code|create)\s+(?:a\s+)?(?:python|javascript|c\+\+|java|rust|go|react|html|css|php)\s+(?:web\s+scraper|scraper|game|bot|crawler|app|application|website|todo\s+list)\b",
        r"\b(?:what\s+is\s+the\s+capital\s+of|who\s+is\s+the\s+president\s+of|how\s+far\s+is\s+the\s+moon|what\s+is\s+the\s+meaning\s+of\s+life)\b"
    ]
    for pat in JOKE_OR_CREATIVE_PATTERNS + CHITCHAT_PATTERNS + GENERAL_CODING_PATTERNS:
        if re.search(pat, lower_prompt):
            return PromptValidationResult(
                is_valid=False,
                rule_violated="Off-topic",
                message="Off-topic query: Questions must be focused on analyzing the uploaded dataset. Jokes, general conversation, and general coding tasks are not supported."
            )

    # Rule 8: Missing data (refuse if it needs a column or table not in schema, and list available columns)
    if df is not None and not df.empty:
        available_cols = list(df.columns)
        available_cols_lower = {c.lower(): c for c in df.columns}

        # Check explicit table reference (e.g. from table 'users')
        table_match = re.search(r"\b(?:from|in)\s+table\s+['\"]?([a-zA-Z_][a-zA-Z0-9_]*)['\"]?", lower_prompt)
        if table_match:
            ref_table = table_match.group(1).lower()
            if ref_table not in {"df", "data", "dataset"}:
                return PromptValidationResult(
                    is_valid=False,
                    rule_violated="Missing data",
                    message=f"The requested table '{table_match.group(1)}' is not in the schema. The active dataset contains columns: {', '.join(available_cols)}."
                )

        # Look for explicit column references
        col_patterns = [
            r"\b(?:column|field|attribute)\s+['\"]?([a-zA-Z_][a-zA-Z0-9_]*)['\"]?",
            r"\b(?:group\s+by|filter\s+by|sort\s+by|order\s+by|breakdown\s+by)\s+['\"]?([a-zA-Z_][a-zA-Z0-9_]*)['\"]?",
            r"\b(?:sum|avg|average|mean|median|min|max|total)\s+(?:of\s+)?['\"]?([a-zA-Z_][a-zA-Z0-9_]*)['\"]?",
            r"\b(?:show|find|list|get)\s+(?:me\s+)?(?:the\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:by|for|of|per|in|where)\b"
        ]
        for pat in col_patterns:
            matches = re.finditer(pat, lower_prompt)
            for m in matches:
                cand = m.group(1).lower()
                if cand not in available_cols_lower and cand not in GENERIC_ANALYTICS_WORDS:
                    return PromptValidationResult(
                        is_valid=False,
                        rule_violated="Missing data",
                        message=f"The requested column '{m.group(1)}' was not found in the dataset schema. Available columns are: {', '.join(available_cols)}."
                    )

    # Rule 9: Ambiguous (ask one clarifying question if too vague, e.g. "show the best ones")
    AMBIGUOUS_PATTERNS = [
        r"^\s*(?:show|find|list|get|display|give\s+me)\s+(?:the\s+)?best\s*(?:ones?|records?|rows?|items?)?\s*[.?!]*$",
        r"^\s*(?:which|what)\s+(?:is|are)\s+(?:the\s+)?best\s*[.?!]*$",
        r"^\s*(?:show|find|list|get|display|give\s+me)\s+(?:the\s+)?worst\s*(?:ones?|records?|rows?|items?)?\s*[.?!]*$",
        r"^\s*(?:give\s+me|show\s+me|display|get)\s+(?:the\s+)?data\s*[.?!]*$",
        r"^\s*(?:analyze|examine|explore|inspect)\s+(?:this|the\s+data|it|everything)\s*[.?!]*$",
        r"^\s*(?:tell\s+me\s+about\s+it|what\s+can\s+you\s+tell\s+me|do\s+analysis|do\s+something)\s*[.?!]*$",
        r"^\s*(?:show|get|find)\s+(?:top|bottom)\s*[.?!]*$"
    ]
    for pat in AMBIGUOUS_PATTERNS:
        if re.search(pat, lower_prompt):
            if "best" in lower_prompt or "worst" in lower_prompt:
                clarification = "Your question is too ambiguous. Which metric or column should define 'best' or 'worst' (e.g., highest value, highest rating, or largest volume)?"
            else:
                clarification = "Your question is too ambiguous. Could you specify which columns or metrics you want to analyze (e.g., summary statistics, breakdown by category, or distributions)?"
            return PromptValidationResult(
                is_valid=False,
                rule_violated="Ambiguous",
                message=clarification,
                clarification=clarification
            )

    return PromptValidationResult(
        is_valid=True,
        sanitized_prompt=trimmed
    )


class PandasASTValidator(ast.NodeVisitor):
    def __init__(self):
        self.errors: List[str] = []
        self.rules_applied: List[str] = [
            "AST syntax verification",
            "Disallow module imports",
            "Disallow dynamic code execution (eval/exec)",
            "Disallow file and network I/O",
            "Disallow private and dunder attribute access",
            "Disallow disk-write Pandas export methods"
        ]

    def visit_Import(self, node: ast.Import):
        self.errors.append("Forbidden import: Module imports are prohibited in pandas expressions.")
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        self.errors.append(f"Forbidden import: Module imports from '{node.module}' are prohibited.")
        self.generic_visit(node)

    def visit_Name(self, node: ast.Name):
        if node.id.startswith("__"):
            self.errors.append(f"Forbidden reference to dunder name '{node.id}'.")
        elif node.id in FORBIDDEN_PYTHON_NAMES:
            self.errors.append(f"Forbidden reference to '{node.id}'.")
        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute):
        if node.attr.startswith("__"):
            self.errors.append(f"Forbidden access to private/dunder attribute '{node.attr}'.")
        if node.attr in FORBIDDEN_PANDAS_METHODS:
            self.errors.append(f"Forbidden data-export or write method '{node.attr}'. Read-only analysis is enforced.")
        if node.attr in FORBIDDEN_PYTHON_NAMES:
            self.errors.append(f"Forbidden attribute access: '{node.attr}'.")
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        if isinstance(node.func, ast.Name):
            if node.func.id in FORBIDDEN_PYTHON_NAMES or node.func.id.startswith("__"):
                self.errors.append(f"Forbidden function call '{node.func.id}()'.")
        self.generic_visit(node)


def validate_sql_safety(query: str) -> SafetyResult:
    """Rule 10: Ensures SQL code is a single SELECT or WITH statement without DDL/DML or multiple statements."""
    cleaned = clean_code_block(query, "sql").strip()
    
    # Remove single line comments
    normalized = re.sub(r"--.*$", "", cleaned, flags=re.MULTILINE)
    # Remove block comments
    normalized = re.sub(r"/\*.*?\*/", "", normalized, flags=re.DOTALL).strip()
    
    rules = [
        "Single statement read-only query enforcement (SELECT / WITH only)",
        "DDL/DML blocklist validation (No DROP, ALTER, DELETE, etc.)",
        "Multiple statement / stacked query prevention"
    ]
    
    if not normalized:
        return SafetyResult(
            passed=False,
            message="SQL query cannot be empty.",
            sanitized_code="",
            rules_applied=rules,
            risk_level="blocked"
        )
    
    # Must start with SELECT or WITH
    upper_trimmed = normalized.upper().lstrip()
    if not (upper_trimmed.startswith("SELECT") or upper_trimmed.startswith("WITH")):
        return SafetyResult(
            passed=False,
            message="Only a single SELECT or WITH (CTE) query is permitted. Non-SELECT and write operations are blocked.",
            sanitized_code=cleaned,
            rules_applied=rules,
            risk_level="blocked"
        )
        
    # Check for stacked semicolon statements
    check_chain = re.sub(r";\s*$", "", normalized)
    if ";" in check_chain:
        parts = [p.strip() for p in check_chain.split(";") if p.strip()]
        if len(parts) > 1:
            return SafetyResult(
                passed=False,
                message="Multiple stacked statements separated by ';' are prohibited. Only a single SELECT statement is allowed.",
                sanitized_code=cleaned,
                rules_applied=rules,
                risk_level="blocked"
            )

    # Check against forbidden keywords regex
    for pattern in FORBIDDEN_SQL_PATTERNS:
        matches = re.findall(pattern, normalized, re.IGNORECASE)
        if matches:
            forbidden_kw = matches[0] if isinstance(matches[0], str) else matches[0][0]
            return SafetyResult(
                passed=False,
                message=f"Query rejected: Forbidden keyword or operation detected: '{forbidden_kw}'. Only safe, read-only analytical queries are permitted.",
                sanitized_code=cleaned,
                rules_applied=rules,
                risk_level="blocked"
            )

    return SafetyResult(
        passed=True,
        message="SQL safety verification passed. Verified as single read-only analytical SELECT query.",
        sanitized_code=cleaned,
        rules_applied=rules,
        risk_level="low"
    )


def validate_pandas_safety(code: str) -> SafetyResult:
    """Rule 10: Ensures Pandas code contains no imports, no open/eval/exec, no dunders, and no file/network access."""
    cleaned = clean_code_block(code, "python").strip()
    
    if not cleaned:
        return SafetyResult(
            passed=False,
            message="Pandas code cannot be empty.",
            sanitized_code="",
            rules_applied=["Syntax check"],
            risk_level="blocked"
        )
        
    try:
        tree = ast.parse(cleaned)
    except SyntaxError as e:
        return SafetyResult(
            passed=False,
            message=f"Python syntax error at line {e.lineno}: {e.msg}",
            sanitized_code=cleaned,
            rules_applied=["AST parser validation"],
            risk_level="blocked"
        )
        
    validator = PandasASTValidator()
    validator.visit(tree)
    
    if validator.errors:
        return SafetyResult(
            passed=False,
            message="Code safety sandbox rejection: " + " ".join(validator.errors),
            sanitized_code=cleaned,
            rules_applied=validator.rules_applied,
            risk_level="blocked"
        )
        
    return SafetyResult(
        passed=True,
        message="Pandas AST sandbox validation passed. No unauthorized system, file, or network access detected.",
        sanitized_code=cleaned,
        rules_applied=validator.rules_applied,
        risk_level="low"
    )
