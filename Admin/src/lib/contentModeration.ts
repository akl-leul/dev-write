// Simple hate speech detection patterns
// In production, this would use AI/ML models for more accurate detection

const hateSpeechPatterns = [
  // Slurs and explicit hate
  /\b(hate|kill|murder|attack)\s+(all\s+)?(jews|muslims|christians|blacks|whites|asians|gays|women|men)\b/gi,
  /\b(die|death\s+to)\s+(all\s+)?(jews|muslims|christians|blacks|whites|asians|gays|women|men)\b/gi,
  // Explicit violence
  /\b(should\s+be|must\s+be|need\s+to\s+be)\s+(killed|murdered|eliminated|exterminated)\b/gi,
  // Dehumanizing language
  /\b(are\s+)(animals|subhuman|parasites|vermin|cockroaches)\b/gi,
  // Threats
  /\b(i\s+will|gonna|going\s+to)\s+(kill|murder|hurt|attack|bomb)\b/gi,
  // Racial slurs (abbreviated for safety, would be more comprehensive in production)
  /\bn[i1]gg[ae3]r/gi,
  /\bk[i1]ke/gi,
  /\bsp[i1]c/gi,
  /\bch[i1]nk/gi,
  /\bf[a@]gg?[o0]t/gi,
];

const toxicPatterns = [
  /\b(idiot|moron|retard|stupid)\s+(you|everyone|people)\b/gi,
  /\byou\s+(suck|are\s+trash|are\s+garbage|are\s+worthless)\b/gi,
  /\bgo\s+(die|kill\s+yourself)\b/gi,
  /\bnobody\s+(cares|loves\s+you|wants\s+you)\b/gi,
];

export interface ModerationResult {
  flagged: boolean;
  reason: string | null;
  severity: "none" | "low" | "medium" | "high";
  shouldDelete: boolean;
}

export function moderateContent(content: string): ModerationResult {
  const lowerContent = content.toLowerCase();

  // Check for hate speech patterns
  for (const pattern of hateSpeechPatterns) {
    if (pattern.test(content)) {
      return {
        flagged: true,
        reason: "Content contains hate speech",
        severity: "high",
        shouldDelete: true,
      };
    }
  }

  // Check for toxic patterns
  for (const pattern of toxicPatterns) {
    if (pattern.test(content)) {
      return {
        flagged: true,
        reason: "Content contains toxic language",
        severity: "medium",
        shouldDelete: true,
      };
    }
  }

  return {
    flagged: false,
    reason: null,
    severity: "none",
    shouldDelete: false,
  };
}

export function sanitizeContent(content: string): string {
  let sanitized = content;
  
  // Replace flagged patterns with asterisks
  [...hateSpeechPatterns, ...toxicPatterns].forEach((pattern) => {
    sanitized = sanitized.replace(pattern, (match) => "*".repeat(match.length));
  });

  return sanitized;
}
