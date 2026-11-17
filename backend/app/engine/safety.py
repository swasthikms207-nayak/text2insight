import ast
import re
from typing import Tuple, List
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


class PandasASTValidator(ast.NodeVisitor):
    def __init__(self):
        self.errors: List[str] = []
        self.rules_applied: List[str] = [
            "AST syntax verification",
            "Disallow module imports",
            "Disallow dynamic code execution (eval/exec)",
            "Disallow file and network I/O",
            "Disallow disk-write Pandas export methods"
        ]

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            if alias.name not in {"math", "datetime", "re", "numpy", "np", "pandas", "pd"}:
                self.errors.append(f"Forbidden import: '{alias.name}'. Only standard transformations are allowed.")
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        if node.module not in {"math", "datetime", "re", "numpy", "pandas"}:
            self.errors.append(f"Forbidden import from module: '{node.module}'.")
        self.generic_visit(node)

    def visit_Name(self, node: ast.Name):
        if node.id in FORBIDDEN_PYTHON_NAMES:
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
        if isinstance(node.func, ast.Name) and node.func.id in FORBIDDEN_PYTHON_NAMES:
            self.errors.append(f"Forbidden function call '{node.func.id}()'.")
        self.generic_visit(node)


def validate_sql_safety(query: str) -> SafetyResult:
    cleaned = clean_code_block(query, "sql").strip()
    
    # Remove single line comments
    normalized = re.sub(r"--.*$", "", cleaned, flags=re.MULTILINE)
    # Remove block comments
    normalized = re.sub(r"/\*.*?\*/", "", normalized, flags=re.DOTALL).strip()
    
    rules = [
        "Read-only query enforcement (SELECT / WITH only)",
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
    if not (upper_trimmed.startswith("SELECT") or upper_trimmed.startswith("WITH") or upper_trimmed.startswith("EXPLAIN")):
        return SafetyResult(
            passed=False,
            message="Only SELECT, WITH (CTE), or EXPLAIN statements are permitted. Write operations and administrative queries are blocked.",
            sanitized_code=cleaned,
            rules_applied=rules,
            risk_level="blocked"
        )
        
    # Check for stacked semicolon statements
    # Remove trailing semicolon first
    check_chain = re.sub(r";\s*$", "", normalized)
    if ";" in check_chain:
        # Check if semicolon is inside string literals
        # Simple heuristic: split by ; and check if multiple non-empty statements exist
        parts = [p.strip() for p in check_chain.split(";") if p.strip()]
        if len(parts) > 1:
            return SafetyResult(
                passed=False,
                message="Multiple stacked statements separated by ';' are prohibited to prevent injection.",
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
        message="SQL safety verification passed. Verified as read-only analytical query.",
        sanitized_code=cleaned,
        rules_applied=rules,
        risk_level="low"
    )


def validate_pandas_safety(code: str) -> SafetyResult:
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
