import type { Word } from "../types";

/**
 * Builds a lesson's questions from its words. Every choice comes from the same lesson
 * (content guarantees 4-6 words with distinct emojis), so there's always exactly one
 * right picture.
 */
export type Question =
  | { kind: "listen"; id: string; word: Word; choices: Word[] } // hear it, tap the picture
  | { kind: "picture"; id: string; word: Word; choices: Word[] } // see the picture, tap the Spanish
  | { kind: "read"; id: string; word: Word; choices: Word[] } // read the Spanish, tap the picture
  | { kind: "match"; id: string; words: Word[] }; // pair each Spanish word with its picture

const CHOICES = 4;
const MATCH_PAIRS = 4;
const SINGLE_QUESTIONS = 9; // plus one match round: about 10 per lesson

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function choicesFor(word: Word, words: Word[], random: () => number): Word[] {
  const others = shuffle(
    words.filter((w) => w.id !== word.id),
    random,
  ).slice(0, CHOICES - 1);
  return shuffle([word, ...others], random);
}

/**
 * Two passes over the words, each in a fresh random order, cycling through the question
 * kinds so each word is asked two different ways. Without a Spanish voice the listening
 * kind is left out rather than showing a silent speaker button.
 */
export function buildQuestions(
  words: Word[],
  canListen: boolean,
  random: () => number = Math.random,
): Question[] {
  const kinds = canListen
    ? (["listen", "read", "picture"] as const)
    : (["read", "picture"] as const);
  const singles: Question[] = [];
  const firstKind = new Map<string, number>(); // word id -> index into kinds
  let next = 0;
  for (let pass = 0; pass < 2 && singles.length < SINGLE_QUESTIONS; pass++) {
    let order = shuffle(words, random);
    // Don't ask about the same word twice in a row across the pass boundary.
    const last = singles.at(-1);
    if (last && "word" in last && order[0].id === last.word.id) {
      order = [...order.slice(1), order[0]];
    }
    for (const word of order) {
      if (singles.length >= SINGLE_QUESTIONS) break;
      let index: number;
      if (pass === 0) {
        index = next++ % kinds.length;
        firstKind.set(word.id, index);
      } else {
        index = ((firstKind.get(word.id) ?? 0) + 1) % kinds.length;
      }
      const kind = kinds[index];
      singles.push({
        kind,
        id: `${kind}-${word.id}`,
        word,
        choices: choicesFor(word, words, random),
      });
    }
  }

  const match: Question = {
    kind: "match",
    id: "match",
    words: shuffle(words, random).slice(0, MATCH_PAIRS),
  };
  // The match round goes in the middle, as a change of pace.
  const middle = Math.ceil(singles.length / 2);
  return [...singles.slice(0, middle), match, ...singles.slice(middle)];
}
