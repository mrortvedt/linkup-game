"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Zap, Calendar, ArrowRight } from "lucide-react";
import { useGameStore, getDailySeed, calculateScore, GameMode } from "@/lib/store";
import { getDailyWordPair, getRandomWordPair } from "@/lib/datamuse";
import { validateLink } from "@/lib/validator";

const dropIn = {
  hidden: { opacity: 0, y: -30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", damping: 20, stiffness: 300 } },
};

const gentleTilt = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, rotate: 0 },
  exit: { opacity: 0, rotate: [0, -1, 1, -1, 1, 0], y: 4, transition: { duration: 0.4 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

interface WordBlockProps {
  word: string;
  variant: "start" | "chain" | "end" | "target";
  relationLabel?: string;
  creativityStars?: number;
  isHubWord?: boolean;
  animate?: boolean;
  compact?: boolean;
}

function WordBlock({ word, variant, relationLabel, creativityStars = 0, isHubWord = false, animate = false, compact = false }: WordBlockProps) {
  const isTarget = variant === "target";
  const isStart = variant === "start";
  const isEnd = variant === "end";

  const blockClass = isTarget
    ? "bg-paper border-2 border-dashed border-ink-faint text-ink-muted"
    : isStart || isEnd
      ? "cloud-tile bg-matcha-50 border-matcha-200"
      : "cloud-tile";

  const content = (
    <div className="flex flex-col items-center">
      {relationLabel && !compact && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-2 flex items-center gap-2">
          <span className="text-xs text-ink-muted uppercase tracking-wider">{relationLabel}</span>
          {isHubWord && <span className="text-xs text-feedback-warning px-1.5 py-0.5 rounded-full bg-feedback-warning/10">+1</span>}
        </motion.div>
      )}
      <div className={`relative ${compact ? "px-4 py-2" : "px-8 py-4"} rounded-2xl ${blockClass}`}>
        <span className={`word-serif ${compact ? "text-base" : "text-xl"} ${isTarget ? "opacity-40" : "text-ink"}`}>{word}</span>
        {creativityStars > 0 && !compact && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="absolute -right-2 -top-2 flex">
            {Array.from({ length: creativityStars }).map((_, i) => <Star key={i} size={14} className="star-gold fill-current -ml-1 first:ml-0" />)}
          </motion.div>
        )}
      </div>
      {!compact && isStart && <span className="mt-2 text-xs text-ink-muted uppercase tracking-widest">Start</span>}
      {!compact && isTarget && <span className="mt-2 text-xs text-ink-muted uppercase tracking-widest">Target</span>}
      {!compact && isEnd && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-2 text-xs text-matcha-600 uppercase tracking-widest font-medium">Complete!</motion.span>}
    </div>
  );

  if (animate) return <motion.div variants={dropIn} initial="hidden" animate="visible">{content}</motion.div>;
  return content;
}

function Connector({ animate = false }: { animate?: boolean }) {
  return (
    <motion.div className="flex flex-col items-center py-3" initial={animate ? { opacity: 0, scaleY: 0 } : false} animate={{ opacity: 1, scaleY: 1 }} transition={{ duration: 0.3 }}>
      <div className="w-px h-10 bg-ink-faint relative overflow-hidden">
        <motion.div className="absolute w-1.5 h-1.5 bg-matcha-400 rounded-full left-1/2 -translate-x-1/2" initial={{ top: 0 }} animate={{ top: "100%" }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
      </div>
    </motion.div>
  );
}

function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => { const timer = setTimeout(onDismiss, 2500); return () => clearTimeout(timer); }, [onDismiss]);
  return <motion.div variants={gentleTilt} initial="hidden" animate="visible" exit="exit" className="px-4 py-2 rounded-xl bg-white border border-feedback-error/20 text-feedback-error text-sm shadow-sm">{message}</motion.div>;
}

function ModeToggle({ mode, onModeChange }: { mode: GameMode; onModeChange: (mode: GameMode) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/50 border border-cloud-border">
      <button onClick={() => onModeChange("daily")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${mode === "daily" ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}><Calendar size={14} />Daily</button>
      <button onClick={() => onModeChange("endless")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${mode === "endless" ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}><Zap size={14} />Practice</button>
    </div>
  );
}

export default function Home() {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const chainEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mode, startWord, endWord, chain, status, penaltySteps, setMode, initGame, initEndlessGame, addLink, recordFailure, clearFailure, getCurrentWord, getMostCreativeLink, playAgain } = useGameStore();

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
  useEffect(() => { chainEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chain.length]);
  useEffect(() => { if (status === "playing") inputRef.current?.focus(); }, [status]);

  const handleModeChange = useCallback((newMode: GameMode) => { setMode(newMode); }, [setMode]);

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
    if (result.valid) { addLink(result); setValue(""); } else { recordFailure(word, result.message); setError(result.message); }
    setIsValidating(false);
  }, [value, isValidating, status, getCurrentWord, startWord, chain, endWord, addLink, recordFailure]);

  const handleDismissError = useCallback(() => { setError(null); clearFailure(); }, [clearFailure]);
  const handlePlayAgain = useCallback(async () => { playAgain(); await loadGame("endless"); }, [playAgain, loadGame]);

  if (status === "loading" || !startWord) {
    return <main className="min-h-screen flex flex-col items-center justify-center bg-paper"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-ink-muted animate-soft-pulse">Loading puzzle...</motion.div></main>;
  }

  const hasWon = status === "won";
  const score = hasWon ? calculateScore(chain.length, penaltySteps, chain.reduce((s, l) => s + l.creativityStars, 0)) : null;
  const currentWord = getCurrentWord();

  return (
    <main className="h-[100dvh] flex flex-col bg-paper">
      {/* Header */}
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex-shrink-0 bg-paper/80 backdrop-blur-md border-b border-cloud-border z-10">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-between">
          <h1 className="word-serif text-xl text-ink">LinkUp</h1>
          <ModeToggle mode={mode} onModeChange={handleModeChange} />
        </div>
      </motion.header>

      {/* Scrollable Chain Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><WordBlock word={startWord} variant="start" /></motion.div>
          <Connector />
          <AnimatePresence mode="popLayout">
            {chain.map((link, i) => (
              <motion.div key={link.word + i} className="flex flex-col items-center" layout>
                <WordBlock word={link.word} variant={link.word.toLowerCase() === endWord.toLowerCase() ? "end" : "chain"} relationLabel={link.relationLabel} creativityStars={link.creativityStars} isHubWord={link.isHubWord} animate={true} />
                {i < chain.length - 1 && <Connector animate={true} />}
                {link.word.toLowerCase() !== endWord.toLowerCase() && i === chain.length - 1 && <Connector animate={true} />}
              </motion.div>
            ))}
          </AnimatePresence>

          {!hasWon && chain.length > 0 && (
            <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="contents">
              <div className="min-h-[40px]" />
              <Connector />
              <WordBlock word={endWord} variant="target" />
            </motion.div>
          )}

          {!hasWon && chain.length === 0 && (
            <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="contents">
              <div className="min-h-[40px]" />
              <Connector />
              <WordBlock word={endWord} variant="target" />
            </motion.div>
          )}

          {/* Win Screen */}
          <AnimatePresence>
            {hasWon && score && (
              <motion.div ref={chainEndRef} variants={fadeUp} initial="hidden" animate="visible" className="mt-6 w-full max-w-sm pb-4">
                <div className="cloud-tile p-6 text-center">
                  <motion.h2 initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="word-serif text-3xl text-matcha-600 mb-2">Connected!</motion.h2>
                  <p className="text-ink-muted mb-6">You linked <span className="word-serif text-ink">{startWord}</span> to <span className="word-serif text-ink">{endWord}</span></p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}><div className="text-2xl font-semibold text-ink">{score.steps}</div><div className="text-xs text-ink-muted">Steps</div></motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}><div className="text-2xl font-semibold text-ink flex items-center justify-center gap-1">{chain.reduce((s, l) => s + l.creativityStars, 0)}<Star size={16} className="star-gold fill-current" /></div><div className="text-xs text-ink-muted">Stars</div></motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}><div className="text-2xl font-semibold text-matcha-600">{score.finalScore}</div><div className="text-xs text-ink-muted">Score</div></motion.div>
                  </div>
                </div>

                {(() => {
                  const bestLink = getMostCreativeLink();
                  if (!bestLink || bestLink.creativityStars < 2) return null;
                  const linkIndex = chain.findIndex(l => l.word === bestLink.word);
                  const fromWord = linkIndex === 0 ? startWord : chain[linkIndex - 1]?.word;
                  return (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-4 p-4 rounded-2xl bg-matcha-50 border border-matcha-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex">{Array.from({ length: bestLink.creativityStars }).map((_, i) => <motion.div key={i} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.8 + i * 0.1, type: "spring" }}><Star size={16} className="star-gold fill-current" /></motion.div>)}</div>
                        <span className="text-xs text-matcha-700 uppercase tracking-wider font-medium">Unusual Link</span>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <span className="word-serif text-lg text-ink-light">{fromWord}</span>
                        <span className="text-matcha-500">→</span>
                        <span className="word-serif text-lg text-ink font-medium">{bestLink.word}</span>
                      </div>
                      <div className="mt-2 text-xs text-ink-muted text-center">{bestLink.relationLabel} • {Math.round((1 - bestLink.heat) * 100)}% creative</div>
                    </motion.div>
                  );
                })()}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-4 flex gap-3">
                  <button className="flex-1 btn-soft py-3" onClick={() => {
                    const gameNum = mode === "daily" ? "#" + Math.floor(Date.now() / 86400000) : "(Practice)";
                    const text = "LinkUp " + gameNum + "\n" + startWord + " → " + endWord + "\n" + score.steps + " steps • " + chain.reduce((s, l) => s + l.creativityStars, 0) + " stars";
                    navigator.clipboard?.writeText(text);
                  }}>Copy Results</button>
                  {mode === "endless" && <button className="flex-1 btn-secondary py-3" onClick={handlePlayAgain}>Play Again</button>}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chainEndRef} className="h-4" />
        </div>
      </div>

      {/* Fixed Bottom Input Bar - stays above keyboard */}
      {!hasWon && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 bg-paper border-t border-cloud-border"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* Current -> Target mini bar */}
          <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm">
            <span className="word-serif text-ink">{currentWord}</span>
            <ArrowRight size={14} className="text-ink-muted" />
            <span className="text-ink-muted">...</span>
            <ArrowRight size={14} className="text-ink-muted" />
            <span className="word-serif text-ink-light">{endWord}</span>
            <span className="ml-2 text-xs text-ink-muted">({chain.length} step{chain.length !== 1 ? "s" : ""})</span>
          </div>

          {/* Error toast */}
          <div className="max-w-lg mx-auto px-4">
            <AnimatePresence mode="wait">
              {error && <ErrorToast key="error" message={error} onDismiss={handleDismissError} />}
            </AnimatePresence>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-3">
            <div className="floating-input p-1 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value.toLowerCase())}
                disabled={isValidating}
                placeholder={isValidating ? "Checking..." : "Enter a word..."}
                className="flex-1 px-4 py-3 rounded-xl bg-transparent text-ink placeholder-ink-muted focus:outline-none disabled:opacity-50 text-center word-serif text-lg"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="go"
              />
              {isValidating && <div className="w-5 h-5 border-2 border-matcha-400 border-t-transparent rounded-full animate-spin mr-2" />}
            </div>
          </form>
        </motion.div>
      )}
    </main>
  );
}
