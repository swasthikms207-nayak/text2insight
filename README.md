# Text2Insight 📊
### Natural Language AI Data Analyst & Safe Execution Sandbox

**Text2Insight** is a full-stack data analytics application built with a **Python FastAPI** backend and a **React + Recharts** frontend. It translates natural language questions into executable SQL or Pandas code, runs the code inside a multi-layered safety sandbox, and delivers interactive data tables, dynamic charts, and executive insights styled in a refined **monochromatic blue** theme (`#1A73E8` primary).

---

## ✨ Key Features

- **Multi-Source Data Ingestion:**
  - 📁 **CSV & Excel Uploads:** Instant drag-and-drop ingestion with automatic column data type inference (`INTEGER`, `FLOAT`, `DATETIME`, `STRING`, `BOOLEAN`).
  - 🐘 **PostgreSQL Connection:** Connect directly to any PostgreSQL database with credentials or connection strings.
  - 📦 **Pre-loaded Curated Datasets:** 1-click loading for:
    - *SaaS Customer Subscriptions & Churn* (120 accounts, MRR, NPS, ticket volume)
    - *Global E-Commerce Sales & Deliveries* (160 retail transactions across categories & regions)
    - *Tech Giants Financial Performance 2024* (Quarterly revenue, net income, R&D spend)

- **Natural Language to Code (SQL & Pandas):**
  - **Google Gemini Integration:** Connect your Gemini API Key (`gemini-3.8-flash` or `gemini-3.5-flash-lite`) for multi-step analytical reasoning.
  - **Groq API Integration:** Connect your Groq API Key (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, or `openai/gpt-oss-20b`) for ultra-low latency LPU analytical code generation.
  - **Qwen Cloud Integration:** Connect via Alibaba DashScope (`qwen-2.5-coder-32b-instruct`, `qwen-plus`, `qwen-turbo`) or Groq (`qwen/qwen3.8-27b`).
  - **Local Qwen (Ollama / QLoRA):** Run 100% offline with zero API keys using a local Ollama instance (`text2insight-qwen` or `qwen2.5-coder:7b`).
  - **Built-in Smart Local Engine:** Fully functional out of the box with zero external API key requirements. Handles aggregations, group-bys, top-N rankings, date trends, and complex comparisons.

- **Multi-Layered Safety Sandbox:**
  - 🛡️ **Read-Only SQL Enforcement:** Validates that queries strictly start with `SELECT` or `WITH`. Detects and blocks any DDL/DML mutation attempts (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`, `ATTACH`, `COPY`, etc.) and stacked semicolon injections.
  - 🔒 **Python AST Sandbox for Pandas:** Analyzes the Abstract Syntax Tree before execution. Strips imports, blocks calls to `os`, `sys`, `subprocess`, `socket`, `open()`, `eval()`, `exec()`, and forbids disk-writing Pandas export methods (`to_csv`, `to_excel`, `to_sql`).
  - ⏱️ **Execution Timeouts:** 5.0-second watchdog execution timeout protects against infinite loops and heavy unindexed scans.

- **Comprehensive Analytical Output:**
  - 💡 **Executive Insight Card:** Generates a headline summary, key metric badges (e.g. leader, average, total), and actionable takeaway bullets.
  - 📈 **Interactive Charts (Recharts):** Automatically recommends the best chart type (Bar, Line, Area, Pie/Donut, Scatter) with custom tooltips, responsive layout, and interactive type switching.
  - 📋 **Data Table:** Interactive pagination, client-side sorting, column type badges, cross-field search filter, and 1-click CSV export.
  - 💻 **Code & Sandbox Inspector:** Review the exact executed code with execution time (in ms), safety audit verification details, and an **in-browser code editor** to edit code and re-run safely.

- **Design & Aesthetics:**
  - Designed with Google-style **monochromatic blue** aesthetics:
    - Primary: `#1A73E8`
    - Secondary Accents: `#1557B0`, `#4285F4`, `#8AB4F8`, `#0D47A1`
    - Light Tints: `#E8F0FE`, `#D2E3FC`
    - Canvas & Surfaces: `#F8FAFD`, `#FFFFFF`
    - Typography: Clean Inter & JetBrains Mono

---

## 🏗️ Architecture

```
mini_project/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app with CORS & static file mount
│   │   ├── models.py            # Pydantic data schemas
│   │   ├── routers/
│   │   │   ├── datasets.py      # Uploads, PostgreSQL connection, samples
│   │   │   └── query.py         # Query execution & custom code re-run
│   │   ├── engine/
│   │   │   ├── safety.py        # SQL sanitizer & Pandas AST sandbox
│   │   │   ├── executor.py      # DuckDB & pg8000 safe runner
│   │   │   ├── generator.py     # Gemini / Groq / Smart-local code gen
│   │   │   └── insights.py      # Dynamic chart spec & analytical insight gen
│   │   └── data/
│   │       └── sample_data.py   # Curated SaaS, E-Commerce, and Tech datasets
│   ├── test_backend.py          # Backend test suite
│   └── venv/                    # Python virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Header, active dataset badge, settings
│   │   │   ├── QuerySection.jsx # Natural language input & starter chips
│   │   │   ├── InsightCard.jsx  # Structured summary & metric badges
│   │   │   ├── ChartView.jsx    # Recharts dynamic visualization
│   │   │   ├── DataTable.jsx    # Paginated, searchable, exportable table
│   │   │   ├── CodeInspector.jsx# Code viewer, editor & safety audit
│   │   │   ├── DatasetModal.jsx # Samples, file upload & PostgreSQL modal
│   │   │   └── ApiKeyModal.jsx  # LLM provider & API key configuration
│   │   ├── App.jsx              # Main React dashboard application
│   │   └── index.css            # Monochromatic blue theme styling
│   ├── vite.config.js           # Vite config with API proxy
│   └── dist/                    # Compiled production assets
└── run_app.py                   # One-click launcher
```

---

## 🚀 Getting Started

### 1. Quick Launch (Unified Server)
The backend is configured to serve both the REST API and the compiled React frontend simultaneously on port `8000`:

```bash
# Run the launcher
python run_app.py
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.

---

### 2. Running in Development Mode

#### Start FastAPI Backend:
```bash
cd backend
venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Start Vite React Frontend:
```bash
cd frontend
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)**. All `/api` requests are automatically proxied to the backend on port `8000`.

---

## 🧪 Testing Backend & Sandbox
Run the automated test suite verifying SQL generation, DuckDB execution, Pandas AST validation, and security sandbox attack blocking:

```bash
backend\venv\Scripts\python.exe backend\test_backend.py
```

---

## 🔒 Security Guarantees

| Category | Protection Mechanism |
| :--- | :--- |
| **SQL Mutations** | Queries not beginning with `SELECT` or `WITH` are rejected. All DDL/DML keywords (`DROP`, `DELETE`, `UPDATE`, `ALTER`, `CREATE`, etc.) are blocked. |
| **SQL Injection** | Multiple statements separated by semicolons are stripped and blocked. |
| **Pandas AST Sandbox** | Blocks all `import` statements, `open()`, `eval()`, `exec()`, `os`, `sys`, `subprocess`, `requests`, and export methods (`to_csv`, `to_excel`). |
| **Execution Timeouts** | Thread-isolated execution with 5-second watchdog timer prevents CPU exhaustion or hang conditions. |
| **PostgreSQL Isolation** | Runs inside an enforced `SET TRANSACTION READ ONLY` session with server statement timeout. |
