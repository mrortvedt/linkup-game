/**
 * ValidatorService - Core validation pipeline for LinkUp
 * 
 * Validation Steps:
 * A: Verify word exists via Datamuse
 * B: Check relationships in priority order
 * C: Apply hub word penalty
 * 
 * Scoring:
 * - heat = match.score / topScoreFromQuery
 * - creativityStars: 1 (heat > 0.66), 2 (0.40-0.66), 3 (< 0.40)
 * - Cap at 2 stars if word frequency < 0.01
 */

import {
  verifyWord,
  findBestRelation,
  getWordFrequency,
  RelationType,
  DatamuseWord,
} from "./datamuse";

// Hub words that add a penalty step
export const HUB_WORDS = ["thing", "good", "man", "time", "world", "go", "get"];

// Validation result types
export interface ValidationSuccess {
  valid: true;
  word: string;
  relationType: RelationType;
  relationLabel: string;
  heat: number;
  creativityStars: number;
  isHubWord: boolean;
  frequency: number;
}

export interface ValidationFailure {
  valid: false;
  word: string;
  reason: "not_a_word" | "no_connection" | "same_word" | "already_used";
  message: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// Human-readable relation labels
const RELATION_LABELS: Record<RelationType, string> = {
  rel_syn: "Synonym",
  rel_trg: "Association",
  rel_jja: "Property",
  rel_jjb: "Property",
  rel_bga: "Phrase",
  rel_bgb: "Phrase",
  rel_cns: "Slant Link",
};

/**
 * Calculate creativity stars based on heat value
 * Lower heat = more creative = more stars
 */
function calculateCreativityStars(heat: number, frequency: number): number {
  let stars: number;
  
  if (heat > 0.66) {
    stars = 1; // Obvious connection
  } else if (heat >= 0.40) {
    stars = 2; // Decent connection
  } else {
    stars = 3; // Creative connection!
  }
  
  // Cap at 2 stars if using an obscure word (frequency < 0.01)
  // This prevents gaming with rare words
  if (frequency < 0.01 && stars === 3) {
    stars = 2;
  }
  
  return stars;
}

/**
 * Check if a word is a hub word
 */
export function isHubWord(word: string): boolean {
  return HUB_WORDS.includes(word.toLowerCase().trim());
}

/**
 * Main validation function
 * Validates that inputWord can follow previousWord in the chain
 */
export async function validateLink(
  previousWord: string,
  inputWord: string,
  usedWords: string[] = []
): Promise<ValidationResult> {
  const normalizedInput = inputWord.toLowerCase().trim();
  const normalizedPrevious = previousWord.toLowerCase().trim();
  
  // Quick check: same word
  if (normalizedInput === normalizedPrevious) {
    return {
      valid: false,
      word: inputWord,
      reason: "same_word",
      message: "Can't use the same word twice in a row",
    };
  }
  
  // Quick check: already used in chain
  if (usedWords.map(w => w.toLowerCase()).includes(normalizedInput)) {
    return {
      valid: false,
      word: inputWord,
      reason: "already_used",
      message: "This word is already in your chain",
    };
  }
  
  // Step A: Verify word exists
  const wordData = await verifyWord(normalizedInput);
  
  if (!wordData) {
    return {
      valid: false,
      word: inputWord,
      reason: "not_a_word",
      message: "Not a valid word",
    };
  }
  
  // Step B: Find relationship with previous word
  const relation = await findBestRelation(normalizedPrevious, normalizedInput);
  
  if (!relation) {
    return {
      valid: false,
      word: inputWord,
      reason: "no_connection",
      message: "No connection found to \"" + normalizedPrevious + "\"",
    };
  }
  
  // Calculate heat (lower = more creative)
  const heat = relation.match.score / relation.topScore;
  
  // Get frequency for star cap calculation
  const frequency = getWordFrequency(wordData);
  
  // Calculate creativity stars
  const creativityStars = calculateCreativityStars(heat, frequency);
  
  // Step C: Check for hub word
  const hubWord = isHubWord(normalizedInput);
  
  return {
    valid: true,
    word: wordData.word, // Use canonical casing from API
    relationType: relation.relationType,
    relationLabel: RELATION_LABELS[relation.relationType],
    heat,
    creativityStars,
    isHubWord: hubWord,
    frequency,
  };
}

/**
 * Validate if a word can connect directly to the end word
 * Used to check if the puzzle is solved
 */
export async function validateFinalLink(
  currentWord: string,
  endWord: string
): Promise<ValidationResult> {
  return validateLink(currentWord, endWord);
}

/**
 * Get a hint for possible connections from a word
 * Returns top suggestions that would score well
 */
export async function getHints(
  fromWord: string,
  usedWords: string[],
  maxHints: number = 3
): Promise<string[]> {
  // This could be expanded to fetch and filter related words
  // For now, return empty to not spoil the puzzle
  return [];
}
