/**
 * Datamuse API Utility with In-Memory Caching
 * 
 * API Docs: https://www.datamuse.com/api/
 * 
 * Key endpoints:
 * - /words?sp={word}&qe=sp&md=f  -> Check existence + get frequency
 * - /words?rel_syn={word}        -> Synonyms
 * - /words?rel_trg={word}        -> Triggers (associations)
 * - /words?rel_jja={word}        -> Adjectives for noun
 * - /words?rel_jjb={word}        -> Nouns for adjective
 * - /words?rel_bga={word}        -> Words that follow
 * - /words?rel_bgb={word}        -> Words that precede
 * - /words?rel_cns={word}        -> Consonant match
 */

const API_BASE = "https://api.datamuse.com";

// In-memory cache to reduce API calls
const cache = new Map<string, { data: DatamuseWord[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export interface DatamuseWord {
  word: string;
  score: number;
  tags?: string[];  // Contains "f:{frequency}" for word frequency
}

export type RelationType = 
  | "rel_syn"   // Synonyms
  | "rel_trg"   // Triggers (association)
  | "rel_jja"   // Adjectives describing noun
  | "rel_jjb"   // Nouns described by adjective
  | "rel_bga"   // Bigram - words that follow
  | "rel_bgb"   // Bigram - words that precede
  | "rel_cns";  // Consonant match

// Priority order for relationship checking
export const RELATION_PRIORITY: RelationType[] = [
  "rel_syn",
  "rel_trg",
  "rel_jja",
  "rel_jjb",
  "rel_bga",
  "rel_bgb",
  "rel_cns",
];

/**
 * Fetch with caching
 */
async function cachedFetch(url: string): Promise<DatamuseWord[]> {
  const cached = cache.get(url);
  const now = Date.now();
  
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("API error: " + response.status);
    }
    const data: DatamuseWord[] = await response.json();
    cache.set(url, { data, timestamp: now });
    return data;
  } catch (error) {
    console.error("Datamuse fetch error:", error);
    return [];
  }
}

/**
 * Check if a word exists in the dictionary
 * Returns the word data with frequency if found, null if not
 */
export async function verifyWord(word: string): Promise<DatamuseWord | null> {
  const normalizedWord = word.toLowerCase().trim();
  const url = API_BASE + "/words?sp=" + encodeURIComponent(normalizedWord) + "&qe=sp&md=f&max=1";
  
  const results = await cachedFetch(url);
  
  // Must be an exact match
  const match = results.find(r => r.word.toLowerCase() === normalizedWord);
  return match || null;
}

/**
 * Extract word frequency from tags
 * Returns a number between 0-1 (higher = more common)
 */
export function getWordFrequency(word: DatamuseWord): number {
  if (!word.tags) return 0;
  
  const freqTag = word.tags.find(t => t.startsWith("f:"));
  if (!freqTag) return 0;
  
  const freq = parseFloat(freqTag.slice(2));
  return isNaN(freq) ? 0 : freq;
}

/**
 * Get related words for a specific relation type
 */
export async function getRelatedWords(
  word: string,
  relationType: RelationType,
  max: number = 100
): Promise<DatamuseWord[]> {
  const normalizedWord = word.toLowerCase().trim();
  const url = API_BASE + "/words?" + relationType + "=" + encodeURIComponent(normalizedWord) + "&max=" + max;
  
  return cachedFetch(url);
}

/**
 * Check if targetWord appears in the related words of sourceWord for a given relation
 * Returns the match with its score, or null if not found
 */
export async function findWordInRelation(
  sourceWord: string,
  targetWord: string,
  relationType: RelationType
): Promise<{ word: DatamuseWord; topScore: number } | null> {
  const related = await getRelatedWords(sourceWord, relationType);
  
  if (related.length === 0) return null;
  
  const topScore = related[0]?.score || 1;
  const normalizedTarget = targetWord.toLowerCase().trim();
  
  const match = related.find(r => r.word.toLowerCase() === normalizedTarget);
  
  if (match) {
    return { word: match, topScore };
  }
  
  return null;
}

/**
 * Find the best relationship between two words
 * Checks all relation types in priority order
 * Returns the first match found with relation type, score, and top score
 */
export async function findBestRelation(
  sourceWord: string,
  targetWord: string
): Promise<{
  relationType: RelationType;
  match: DatamuseWord;
  topScore: number;
} | null> {
  for (const relationType of RELATION_PRIORITY) {
    const result = await findWordInRelation(sourceWord, targetWord, relationType);
    
    if (result) {
      return {
        relationType,
        match: result.word,
        topScore: result.topScore,
      };
    }
  }
  
  return null;
}

/**
 * Get a random word pair for the daily puzzle
 * Uses seeded selection based on date
 */
export async function getDailyWordPair(seed: number): Promise<{
  start: string;
  end: string;
} | null> {
  // Curated word pairs that are solvable but challenging
  const WORD_PAIRS = [
    { start: "ocean", end: "fire" },
    { start: "night", end: "gold" },
    { start: "stone", end: "dream" },
    { start: "river", end: "tower" },
    { start: "shadow", end: "light" },
    { start: "forest", end: "steel" },
    { start: "winter", end: "song" },
    { start: "cloud", end: "earth" },
    { start: "mirror", end: "path" },
    { start: "thunder", end: "silk" },
    { start: "crystal", end: "flame" },
    { start: "mountain", end: "wave" },
    { start: "garden", end: "storm" },
    { start: "silver", end: "bone" },
    { start: "whisper", end: "iron" },
    { start: "desert", end: "rain" },
    { start: "memory", end: "stone" },
    { start: "bridge", end: "moon" },
    { start: "feather", end: "anchor" },
    { start: "sunrise", end: "shadow" },
    { start: "glass", end: "thunder" },
    { start: "candle", end: "wind" },
    { start: "echo", end: "diamond" },
    { start: "frost", end: "ember" },
    { start: "tide", end: "mountain" },
    { start: "spark", end: "ocean" },
    { start: "castle", end: "leaf" },
    { start: "arrow", end: "cloud" },
    { start: "pearl", end: "flame" },
    { start: "valley", end: "star" },
  ];
  
  const index = seed % WORD_PAIRS.length;
  return WORD_PAIRS[index];
}


/**
 * Get a random word pair for endless/practice mode
 */
export async function getRandomWordPair(): Promise<{
  start: string;
  end: string;
} | null> {
  const PRACTICE_PAIRS = [
    { start: "ocean", end: "fire" },
    { start: "night", end: "gold" },
    { start: "stone", end: "dream" },
    { start: "river", end: "tower" },
    { start: "shadow", end: "light" },
    { start: "forest", end: "steel" },
    { start: "winter", end: "song" },
    { start: "cloud", end: "earth" },
    { start: "mirror", end: "path" },
    { start: "thunder", end: "silk" },
    { start: "crystal", end: "flame" },
    { start: "mountain", end: "wave" },
    { start: "honey", end: "frost" },
    { start: "velvet", end: "stone" },
    { start: "harbor", end: "dust" },
    { start: "lantern", end: "seed" },
    { start: "compass", end: "silk" },
    { start: "copper", end: "snow" },
    { start: "marble", end: "vine" },
    { start: "raven", end: "bloom" },
  ];
  const index = Math.floor(Math.random() * PRACTICE_PAIRS.length);
  return PRACTICE_PAIRS[index];
}

/**
 * Clear the cache (useful for testing)
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache stats (useful for debugging)
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
