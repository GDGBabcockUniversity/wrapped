"use client";

import { useEffect, useRef, useState } from "react";
import { GUESS_GAME, PRODUCTS } from "@/lib/content/chapter";
import { fmt } from "@/lib/copy";
import { vibrate } from "@/lib/haptics";
import { playSfx } from "@/lib/sfx";

/**
 * The tap-to-guess reactive beat's state machine (build4 §8) — game state
 * only. Rendering stays on built's existing row elements (a `layout`-
 * animated morph, not a remount) so the bars-to-cards transition is smooth.
 */
const WAIT_MS = 6000;
const HOLD_MS = 2400;

export interface GuessAnswer {
  index: number;
  correct: boolean;
}

export function useBuiltGuess(active: boolean, onComplete?: () => void) {
  const [answer, setAnswer] = useState<GuessAnswer | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        setTimedOut(true);
        timers.push(setTimeout(() => onComplete?.(), HOLD_MS));
      }, WAIT_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, [active, onComplete]);

  function onTapRow(i: number) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    const correct = i === GUESS_GAME.answerIndex;
    setAnswer({ index: i, correct });
    vibrate(correct ? 10 : [8, 30, 8]);
    playSfx(correct ? "blip-up" : "blip-down");
    setTimeout(() => onComplete?.(), HOLD_MS);
  }

  const answerName = PRODUCTS[GUESS_GAME.answerIndex]!.name;
  const headline = timedOut
    ? fmt(GUESS_GAME.timeout, { answer: answerName })
    : answer
      ? answer.correct
        ? GUESS_GAME.right
        : GUESS_GAME.wrong
      : GUESS_GAME.question;

  return { headline, answer, timedOut, onTapRow };
}
