/**
 * Prompt Validator: Enforces 10 safety and data-integrity rules
 * BEFORE running any natural language user prompt.
 */

export function validatePromptRules(question, currentDataset) {
  const trimmed = question ? question.trim() : '';

  // Rule 1: Empty or too short (< 3 characters)
  if (trimmed.length < 3) {
    return {
      isValid: false,
      rule: 'Empty or too short',
      message: 'Question is too short. Please provide a question with at least 3 characters.'
    };
  }

  // Rule 2: Too long (> 500 characters)
  if (trimmed.length > 500) {
    return {
      isValid: false,
      rule: 'Too long',
      message: 'Question is too long (maximum 500 characters allowed).'
    };
  }

  const lower = trimmed.toLowerCase();

  // Rule 3: Gibberish (no real words, pure numbers/symbols, keyboard mash, repetitive chars)
  if (!/[a-zA-Z]/.test(trimmed)) {
    return {
      isValid: false,
      rule: 'Gibberish',
      message: 'Question contains no recognizable words (only symbols or numbers).'
    };
  }

  const KEYBOARD_MASH = [
    /asdfgh/i, /asdfg/i, /ghjkl/i, /qwerty/i, /zxcvb/i, /lkjhg/i,
    /poiuy/i, /mnbvc/i, /12345/, /asdfasdf/i, /qweqwe/i, /zxcvzxcv/i
  ];
  for (const pat of KEYBOARD_MASH) {
    if (pat.test(lower)) {
      return {
        isValid: false,
        rule: 'Gibberish',
        message: "Question appears to be keyboard gibberish (e.g. 'asdfgh'). Please ask a meaningful data question."
      };
    }
  }

  if (/([a-zA-Z])\1{4,}/.test(trimmed)) {
    return {
      isValid: false,
      rule: 'Gibberish',
      message: 'Question appears to be gibberish with repetitive characters. Please ask a clear analytical question.'
    };
  }

  const words = lower.match(/[a-zA-Z]+/g) || [];
  const allowedAcronyms = new Set([
    'id', 'sql', 'csv', 'df', 'avg', 'sum', 'max', 'min', 'std', 'pct',
    'qty', 'cnt', 'num', 'usd', 'eur', 'by', 'to', 'in', 'on', 'at', 'is',
    'of', 'or', 'an', 'as', 'no', 'yr', 'mo'
  ]);
  const schemaColsLower = (currentDataset?.columns || []).map(c => (c.name || '').toLowerCase());
  for (const word of words) {
    if (word.length >= 4 && !/[aeiouy]/.test(word)) {
      if (!schemaColsLower.includes(word) && !allowedAcronyms.has(word)) {
        return {
          isValid: false,
          rule: 'Gibberish',
          message: `Question contains unrecognized or gibberish sequence '${word}'. Please use real words.`
        };
      }
    }
  }

  // Rule 4: Modification requests (delete, drop, update, insert, alter, truncate)
  const MODIFICATION_PATTERNS = [
    /\b(delete|drop|update|insert|alter|truncate)\s+(from|table|database|columns?|rows?|records?|the\s+data|all\s+data)\b/i,
    /\b(modify|overwrite|purge|wipe)\s+(the\s+)?(data|table|database|columns?|rows?)\b/i,
    /^\s*(delete|drop|truncate|alter|insert)\b/i,
    /\b(drop\s+table|delete\s+from|insert\s+into|alter\s+table|truncate\s+table)\b/i,
    /\b(delete|drop|truncate|alter|insert)\s+all\b/i
  ];
  for (const pat of MODIFICATION_PATTERNS) {
    if (pat.test(lower)) {
      return {
        isValid: false,
        rule: 'Modification requests',
        message: 'Data modification requests (delete, drop, update, insert, alter, truncate) are not permitted. Only read-only analytical queries are supported.'
      };
    }
  }

  // Rule 5: System or file access (run commands, open files, network, imports)
  const SYSTEM_PATTERNS = [
    /\b(run|execute)\s+(a\s+)?(command|bash|shell|terminal|cmd|powershell|script|process)\b/i,
    /\b(open|read|write|delete)\s+(a\s+)?(local\s+)?(file|filesystem|disk|folder|directory)\b/i,
    /\b(access|use)\s+(the\s+)?(filesystem|network|internet)\b/i,
    /\b(send|make)\s+(an?\s+)?(http|network|post|get|curl|socket)\s+request\b/i,
    /\bimport\s+(module|os|sys|subprocess|shutil|pathlib|socket|urllib|requests|builtins)\b/i,
    /\b(curl|wget|ping)\s+https?:\/\//i,
    /\b(cat|rm|ls)\s+\/(etc|var|usr|bin|home)\b/i,
    /\b(cmd\.exe|powershell\.exe|\/bin\/sh|\/bin\/bash)\b/i
  ];
  for (const pat of SYSTEM_PATTERNS) {
    if (pat.test(lower)) {
      return {
        isValid: false,
        rule: 'System or file access',
        message: 'System or file access requests (running commands, opening files, network requests, importing modules) are strictly prohibited.'
      };
    }
  }

  // Rule 6: Prompt injection (ignore instructions, reveal prompt, act as something else)
  const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts|directions)/i,
    /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts|directions)/i,
    /(reveal|show|print|display|tell\s+me)\s+(your|the)\s+(system\s+)?(prompt|instructions|rules|preprompt)/i,
    /what\s+is\s+your\s+(system\s+)?prompt/i,
    /act\s+as\s+(something\s+else|dan\b|an?\s+unrestricted|a\s+hacker|root|admin|jailbreak)/i,
    /you\s+are\s+now\s+(in\s+)?(developer\s+mode|dan\b|jailbroken|unrestricted)/i,
    /bypass\s+(all\s+)?(safety|guardrails|filters|rules|restrictions)/i,
    /(forget|reset)\s+(all\s+)?(previous|prior)\s+(instructions|context)/i
  ];
  for (const pat of INJECTION_PATTERNS) {
    if (pat.test(lower)) {
      return {
        isValid: false,
        rule: 'Prompt injection',
        message: 'Prompt injection detected. Directives attempting to override instructions, reveal system prompts, or act as other personas are blocked.'
      };
    }
  }

  // Rule 7: Off-topic (jokes, general chat, coding help)
  const OFF_TOPIC_PATTERNS = [
    /\b(tell\s+(me\s+)?(a\s+)?joke|make\s+me\s+laugh)\b/i,
    /\b(write\s+(a\s+)?(joke|poem|story|song|essay|haiku|riddle|novel))\b/i,
    /^\s*(hi|hello|hey|howdy|sup|greetings|good\s+(morning|afternoon|evening))[.?!]*\s*$/i,
    /^\s*(how\s+are\s+you|who\s+are\s+you|what\s+is\s+your\s+name|who\s+created\s+you|what\s+can\s+you\s+do|how\'?s\s+the\s+weather)[.?!]*\s*$/i,
    /^\s*(tell\s+me\s+about\s+yourself|are\s+you\s+an\s+ai|are\s+you\s+human)[.?!]*\s*$/i,
    /\b(how\s+to|how\s+do\s+i)\s+(center\s+a\s+div|build\s+a\s+website|install\s+linux|hack|create\s+a\s+react\s+app)\b/i,
    /\b(write|code|create)\s+(a\s+)?(python|javascript|c\+\+|java|rust|go|react|html|css|php)\s+(web\s+scraper|scraper|game|bot|crawler|app|application|website|todo\s+list)\b/i,
    /\b(what\s+is\s+the\s+capital\s+of|who\s+is\s+the\s+president\s+of|how\s+far\s+is\s+the\s+moon|what\s+is\s+the\s+meaning\s+of\s+life)\b/i
  ];
  for (const pat of OFF_TOPIC_PATTERNS) {
    if (pat.test(lower)) {
      return {
        isValid: false,
        rule: 'Off-topic',
        message: 'Off-topic query: Questions must be focused on analyzing the uploaded dataset. Jokes, general conversation, and general coding tasks are not supported.'
      };
    }
  }

  // Rule 8: Missing data (refuse if column/table not in schema, list available columns)
  if (currentDataset?.columns && currentDataset.columns.length > 0) {
    const availableCols = currentDataset.columns.map(c => c.name || '');
    const availableColsLower = new Set(availableCols.map(c => c.toLowerCase()));
    const GENERIC_ANALYTICS_WORDS = new Set([
      'the', 'a', 'an', 'all', 'each', 'every', 'data', 'dataset', 'table', 'records',
      'rows', 'column', 'columns', 'items', 'values', 'results', 'count', 'number',
      'total', 'value', 'trend', 'distribution', 'summary', 'top', 'bottom', 'first',
      'last', 'highest', 'lowest', 'most', 'least', 'more', 'less', 'it', 'them',
      'this', 'that', 'these', 'those', 'here', 'there', 'group', 'category',
      'rate', 'percentage', 'ratio', 'score', 'amount', 'level', 'average', 'avg',
      'sum', 'mean', 'median', 'minimum', 'maximum', 'chart', 'graph', 'plot'
    ]);

    const tableMatch = lower.match(/\b(?:from|in)\s+table\s+['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?/i);
    if (tableMatch) {
      const refTable = tableMatch[1].toLowerCase();
      if (!['df', 'data', 'dataset'].includes(refTable)) {
        return {
          isValid: false,
          rule: 'Missing data',
          message: `The requested table '${tableMatch[1]}' is not in the schema. Available columns in active dataset: ${availableCols.join(', ')}.`
        };
      }
    }

    const colPatterns = [
      /\b(?:column|field|attribute)\s+['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?/gi,
      /\b(?:group\s+by|filter\s+by|sort\s+by|order\s+by|breakdown\s+by)\s+['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?/gi,
      /\b(?:sum|avg|average|mean|median|min|max|total)\s+(?:of\s+)?['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?/gi,
      /\b(?:show|find|list|get)\s+(?:me\s+)?(?:the\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:by|for|of|per|in|where)\b/gi
    ];
    for (const pat of colPatterns) {
      let m;
      while ((m = pat.exec(lower)) !== null) {
        const cand = m[1].toLowerCase();
        if (!availableColsLower.has(cand) && !GENERIC_ANALYTICS_WORDS.has(cand)) {
          return {
            isValid: false,
            rule: 'Missing data',
            message: `The requested column '${m[1]}' was not found in the dataset schema. Available columns are: ${availableCols.join(', ')}.`
          };
        }
      }
    }
  }

  // Rule 9: Ambiguous (ask clarifying question)
  const AMBIGUOUS_PATTERNS = [
    /^\s*(show|find|list|get|display|give\s+me)\s+(the\s+)?best\s*(ones?|records?|rows?|items?)?\s*[.?!]*$/i,
    /^\s*(which|what)\s+(is|are)\s+(the\s+)?best\s*[.?!]*$/i,
    /^\s*(show|find|list|get|display|give\s+me)\s+(the\s+)?worst\s*(ones?|records?|rows?|items?)?\s*[.?!]*$/i,
    /^\s*(give\s+me|show\s+me|display|get)\s+(the\s+)?data\s*[.?!]*$/i,
    /^\s*(analyze|examine|explore|inspect)\s+(this|the\s+data|it|everything)\s*[.?!]*$/i,
    /^\s*(tell\s+me\s+about\s+it|what\s+can\s+you\s+tell\s+me|do\s+analysis|do\s+something)\s*[.?!]*$/i,
    /^\s*(show|get|find)\s+(top|bottom)\s*[.?!]*$/i
  ];
  for (const pat of AMBIGUOUS_PATTERNS) {
    if (pat.test(lower)) {
      const isBestOrWorst = /best|worst/i.test(lower);
      const clarification = isBestOrWorst
        ? "Your question is too ambiguous. Which metric or column should define 'best' or 'worst' (e.g., highest value, highest rating, or largest volume)?"
        : "Your question is too ambiguous. Could you specify which columns or metrics you want to analyze (e.g., summary statistics, breakdown by category, or distributions)?";
      return {
        isValid: false,
        rule: 'Ambiguous',
        message: clarification,
        clarification: clarification
      };
    }
  }

  return { isValid: true };
}
