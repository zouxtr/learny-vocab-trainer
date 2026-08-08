import { create } from "zustand";
import {
  countWords,
  createDictionary,
  listDictionaries,
  listWordsWithStats,
  updateDictionary,
  deleteDictionary,
  createWord,
  updateWord,
  deleteWord,
  getWord,
  toggleFavorite,
  type NewDictionary,
  type UpdateDictionaryFields,
  type NewWord,
  type UpdateWordFields,
  type WordWithStats,
} from "@/services/dictionaryRepository";
import type { Dictionary } from "@/db/schema";

export interface DictionaryWithCount extends Dictionary {
  wordCount: number;
}

interface DictionaryState {
  dictionaries: DictionaryWithCount[];
  activeDictionaryId: string | null;
  words: WordWithStats[];
  loaded: boolean;
  refresh: () => Promise<void>;
  reloadCounts: () => void;
  create: (input: NewDictionary) => Dictionary | null;
  update: (id: string, fields: UpdateDictionaryFields) => void;
  remove: (id: string) => void;
  favorite: (id: string) => void;
  open: (id: string) => void;
  loadWords: (dictionaryId: string) => void;
  addWord: (input: NewWord) => void;
  editWord: (id: string, fields: UpdateWordFields) => void;
  removeWord: (id: string) => void;
}

function decorate(list: Dictionary[], counts: Record<string, number>): DictionaryWithCount[] {
  return list.map((d) => ({ ...d, wordCount: counts[d.id] ?? 0 }));
}

export const useDictionaryStore = create<DictionaryState>()((set, get) => ({
  dictionaries: [],
  activeDictionaryId: null,
  words: [],
  loaded: false,

  refresh: async () => {
    const rows = listDictionaries();
    const counts: Record<string, number> = {};
    for (const d of rows) counts[d.id] = countWords(d.id);
    set({ dictionaries: decorate(rows, counts), loaded: true });
  },

  reloadCounts: () => {
    const { dictionaries, words, activeDictionaryId } = get();
    set({
      dictionaries: decorate(
        dictionaries,
        Object.fromEntries(dictionaries.map((d) => [d.id, countWords(d.id)])),
      ),
      words: activeDictionaryId ? listWordsWithStats(activeDictionaryId) : words,
    });
  },

  create: (input) => {
    const row = createDictionary(input);
    void get().refresh();
    return row;
  },

  update: (id, fields) => {
    updateDictionary(id, fields);
    void get().refresh();
  },

  remove: (id) => {
    deleteDictionary(id);
    if (get().activeDictionaryId === id) set({ activeDictionaryId: null, words: [] });
    void get().refresh();
  },

  favorite: (id) => {
    toggleFavorite(id);
    void get().refresh();
  },

  open: (id) => {
    set({ activeDictionaryId: id });
    get().loadWords(id);
  },

  loadWords: (dictionaryId) => {
    set({ words: listWordsWithStats(dictionaryId) });
  },

  addWord: (input) => {
    createWord(input);
    get().loadWords(input.dictionaryId);
    get().reloadCounts();
  },

  editWord: (id, fields) => {
    const w = updateWord(id, fields);
    if (w && get().activeDictionaryId === w.dictionaryId) get().loadWords(w.dictionaryId);
  },

  removeWord: (id) => {
    const w = getWord(id);
    deleteWord(id);
    if (w && get().activeDictionaryId === w.dictionaryId) get().loadWords(w.dictionaryId);
    get().reloadCounts();
  },
}));