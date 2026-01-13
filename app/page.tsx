"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, RotateCcw } from "lucide-react";
import { useGameStore, getDailySeed, calculateScore, GameMode } from "@/lib/store";
import { getDailyWordPair, getRandomWordPair } from "@/lib/datamuse";
import { validateLink } from "@/lib/validator";

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const gentleTilt = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, rotate: [0, -1, 1, -1, 0], transition: { duration: 0.3 } },
};

// Floating word - no background, pure typography
function FloatingWord({ word, isTarget = false, isStart = false, stars = 0 }: {
  word: string;
  isTarget?: boolean;
  isStart?: boolean;
  stars?: number;
}) {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="relative py-2"
    >
      <span className={`word-serif text-3xl sm:text-4xl ${isTarget ? "text-ink-muted" : "text-ink"}`}>
        {word}
      </span>
      {stars > 0 && (
        <span className="absolute -right-6 top-0 flex">
          {Array.from({ length: stars }).map((_, i) => (
            <Star key={i} size={12} className="star-gold fill-current" />
          ))}
        </span>
      )}
      {isStart && <span className="block text-[10px] text-ink-muted uppercase tracking-widest mt-1">start</span>}
      {isTarget && <span className="block text-[10px] text-ink-muted uppercase tracking-widest mt-1">goal</span>}
    </motion.div>
  );
}

// Ultra-thin connector
function ThinConnector() {
  return <div className="connector-line h-8 mx-auto" />;
}

// Relation label - subtle
function RelationLabel({ label, isHub }: { label: string; isHub?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-[10px] text-ink-muted uppercase tracking-wider py-1 flex items-center gap-2 justify-center"
    >
      {label}
      {isHub && <span className="text-feedback-warning">+1</span>}
    </motion.div>
  );
}

function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => { const timer = setTimeout(onDismiss, 2500); return () => clearTimeout(timer); }, [onDismiss]);
  return (
    <motion.div
      variants={gentleTilt}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="px-4 py-2 rounded-full bg-white text-feedback-error text-sm shadow-sm"
    >
      {message}
    </motion.div>
  );
}

export default function Home() {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const chainEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    mode, startWord, endWord, chain, status, penaltySteps,
    setMode, initGame, initEndlessGame, addLink, recordFailure,
    clearFailure, getCurrentWord, getMostCreativeLink, playAgain
  } = useGameStore();

  const loadGame = useCallback(async (gameMode: GameMode) => {
    if (gameMode === "daily") {
      const seed = getDailySeed();
      const pair = await getDailyWordPair(seed);
      if (pair) initGame(pair.start, pair.end, seed);
    } else {
      const pair = await getRandomWordPair();
      if (pair) initEndlessGame(pair.start, pair.end);
    }
  }, [initGame, initEndlessGame]);

  useEffect(() => { loadGame(mode); }, [mode, loadGame]);

  useEffect(() => {
    if (chain.length > 0) {
      chainEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [chain.length]);

  useEffect(() => {
    if (status === "playing") inputRef.current?.focus();
  }, [status]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const word = value.trim();
    if (!word || isValidating || status !== "playing") return;
    setIsValidating(true);
    setError(null);
    const currentWord = getCurrentWord();
    const usedWords = [startWord, ...chain.map(l => l.word)];
    const targetWord = word.toLowerCase() === endWord.toLowerCase() ? endWord : word;
    const result = await validateLink(currentWord, targetWord, usedWords);
    if (result.valid) {
      addLink(result);
      setValue("");
    } else {
      recordFailure(word, result.message);
      setError(result.message);
    }
    setIsValidating(false);
  }, [value, isValidating, status, getCurrentWord, startWord, chain, endWord, addLink, recordFailure]);

  const handleDismissError = useCallback(() => { setError(null); clearFailure(); }, [clearFailure]);

  const handleNewGame = useCallback(async () => {
    setMode("endless");
    playAgain();
    await loadGame("endless");
  }, [setMode, playAgain, loadGame]);

  if (status === "loading" || !startWord) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-paper">
        <div className="text-ink-muted animate-soft-pulse word-serif text-xl">Loading...</div>
      </main>
    );
  }

  const hasWon = status === "won";
  const score = hasWon ? calculateScore(chain.length, penaltySteps, chain.reduce((s, l) => s + l.creativityStars, 0)) : null;
  const currentWord = getCurrentWord();

  return (
    <main className="min-h-dvh flex flex-col bg-paper">
      {/* Minimal Header */}
      <header className="flex-shrink-0 px-4 py-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <h1 className="word-serif text-xl text-ink">LinkUp</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-muted">
            {chain.length} step{chain.length !== 1 ? "s" : ""}
            {penaltySteps > 0 && <span className="text-feedback-warning ml-1">+{penaltySteps}</span>}
          </span>
          <button
            onClick={handleNewGame}
            className="p-2 rounded-full hover:bg-ink/5 transition-colors"
            title="New Game"
          >
            <RotateCcw size={16} className="text-ink-muted" />
          </button>
        </div>
      </header>

      {/* Scrollable Chain Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="max-w-lg mx-auto px-4 py-8 flex flex-col items-center">

          {/* Start Word */}
          <FloatingWord word={startWord} isStart />
          <ThinConnector />

          {/* Chain */}
          {chain.map((link, i) => (
            <div key={link.word + i} className="flex flex-col items-center">
              <RelationLabel label={link.relationLabel} isHub={link.isHubWord} />
              <FloatingWord
                word={link.word}
                stars={link.creativityStars}
              />
              {i < chain.length - 1 && <ThinConnector />}
            </div>
          ))}

          {/* Target (when not won) */}
          {!hasWon && (
            <>
              {chain.length > 0 && <ThinConnector />}
              <div className="py-6 opacity-40">
                <ThinConnector />
              </div>
              <FloatingWord word={endWord} isTarget />
            </>
          )}

          {/* Scroll anchor */}
          <div ref={chainEndRef} className="h-4" />

          {/* Win Screen */}
          <AnimatePresence>
            {hasWon && score && (
              <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                className="w-full max-w-sm mt-8 mb-4"
              >
                <div className="editorial-card p-8 text-center">
                  <h2 className="word-serif text-4xl text-ink mb-2">Connected</h2>
                  <p className="text-ink-muted text-sm mb-8">
                    {startWord} → {endWord}
                  </p>

                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <div>
                      <div className="word-serif text-3xl text-ink">{score.steps}</div>
                      <div className="text-[10px] text-ink-muted uppercase tracking-wider">steps</div>
                    </div>
                    <div>
                      <div className="word-serif text-3xl text-ink flex items-center justify-center gap-1">
                        {chain.reduce((s, l) => s + l.creativityStars, 0)}
                        <Star size={16} className="star-gold fill-current" />
                      </div>
                      <div className="text-[10px] text-ink-muted uppercase tracking-wider">stars</div>
                    </div>
                    <div>
                      <div className="word-serif text-3xl text-ink">{score.finalScore}</div>
                      <div className="text-[10px] text-ink-muted uppercase tracking-wider">score</div>
                    </div>
                  </div>

                  {/* Best link highlight */}
                  {(() => {
                    const bestLink = getMostCreativeLink();
                    if (!bestLink || bestLink.creativityStars < 2) return null;
                    const linkIndex = chain.findIndex(l => l.word === bestLink.word);
                    const fromWord = linkIndex === 0 ? startWord : chain[linkIndex - 1]?.word;
                    return (
                      <div className="py-4 border-t border-ink-faint/30">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          {Array.from({ length: bestLink.creativityStars }).map((_, i) => (
                            <Star key={i} size={12} className="star-gold fill-current" />
                          ))}
                          <span className="text-[10px] text-ink-muted uppercase tracking-wider ml-1">best link</span>
                        </div>
                        <div className="word-serif text-lg text-ink">
                          {fromWord} → {bestLink.word}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex gap-3 mt-6">
                    <button
                      className="flex-1 btn-soft"
                      onClick={() => {
                        const gameNum = mode === "daily" ? "#" + Math.floor(Date.now() / 86400000) : "";
                        const text = "LinkUp " + gameNum + "\n" + startWord + " → " + endWord + "\n" + score.steps + " steps • " + chain.reduce((s, l) => s + l.creativityStars, 0) + " ★";
                        navigator.clipboard?.writeText(text);
                      }}
                    >
                      Share
                    </button>
                    <button className="flex-1 btn-secondary" onClick={handleNewGame}>
                      New Game
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed Bottom Input */}
      {!hasWon && (
        <div
          className="flex-shrink-0 bg-paper/80 backdrop-blur-sm border-t border-ink-faint/20"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
        >
          {/* Progress hint */}
          <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-center gap-2 text-xs text-ink-muted">
            <span className="word-serif text-ink">{currentWord}</span>
            <span>→</span>
            <span className="word-serif">{endWord}</span>
          </div>

          {/* Error */}
          <div className="max-w-lg mx-auto px-4">
            <AnimatePresence mode="wait">
              {error && <ErrorToast key="error" message={error} onDismiss={handleDismissError} />}
            </AnimatePresence>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-3">
            <div className="floating-input flex items-center px-2">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value.toLowerCase())}
                disabled={isValidating}
                placeholder="Type a word..."
                className="flex-1 px-4 py-3 bg-transparent text-ink placeholder-ink-muted focus:outline-none text-center word-serif text-lg"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="go"
              />
              {isValidating && (
                <div className="w-5 h-5 border-2 border-ink-muted border-t-transparent rounded-full animate-spin mr-2" />
              )}
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
