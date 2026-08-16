import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CloudUpload,
  GraduationCap,
  Languages,
  Plus,
  Sparkles,
  Upload,
  WifiOff,
} from "lucide-react";

/**
 * Single source of truth for the app's feature list.
 *
 * It drives both the welcome page (HomePage) and the "How it works" page.
 * When you add a new feature, add an entry here (icon, title, description,
 * howToUse) and it automatically appears in both places.
 */

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  howToUse: string;
}

export const FEATURES: Feature[] = [
  {
    icon: BookOpen,
    title: "Create a dictionary",
    description:
      "Each dictionary is a vocabulary list with a language pair — a word language and a translation language, e.g. English → Spanish or Bulgarian → German. Keep one dictionary per topic and favorite or archive them.",
    howToUse: 'Tap "New dictionary", pick the two languages, and name it.',
  },
  {
    icon: Plus,
    title: "Add words",
    description:
      "A word has a source term and a translation, plus optional grammar, example, group, and notes. Add words one by one or import them in bulk from a file, Google Sheet, or TSV link. Export to CSV anytime.",
    howToUse: 'Open a dictionary and use "Add word", or import many at once.',
  },
  {
    icon: Upload,
    title: "Import & export",
    description:
      "Add words in bulk from a CSV or XLSX file, a public Google Sheets link, or a TSV link — and export any list to CSV.",
    howToUse:
      'Open "Import words", pick a file, Google Sheets, or TSV link, then review the columns before importing.',
  },
  {
    icon: Sparkles,
    title: "AI word generation",
    description:
      "Describe the words you need and the AI drafts a list with translations and example sentences; you review, edit, and deselect rows before anything is saved.",
    howToUse:
      'In "Import words", open "Generate with AI", describe the topic, then review and import the rows you want.',
  },
  {
    icon: GraduationCap,
    title: "Study",
    description:
      "Pick a dictionary and practice its words — flashcards, multiple choice, grammar, or typing — in either direction. Each word gets a spaced-repetition schedule, so the app shows you the words you need to review.",
    howToUse: "Open a dictionary and choose a drill from the Study tab.",
  },
  {
    icon: BarChart3,
    title: "Track progress",
    description:
      "Sessions record your answers. The summary shows how many words you reviewed and your accuracy, and words you keep missing get scheduled again sooner.",
    howToUse: "Finish a session and check the summary for words reviewed and accuracy.",
  },
  {
    icon: CloudUpload,
    title: "Cloud sync",
    description:
      "Your data stays in your browser by default. Optionally connect your own Dropbox to back the database up to the cloud — the app talks to Dropbox directly, with no server or account of its own.",
    howToUse: "Connect your Dropbox account in Settings to enable cloud backup.",
  },
  {
    icon: WifiOff,
    title: "Offline & private",
    description:
      "Everything runs locally in your browser and keeps working offline. Install it as an app — no account needed.",
    howToUse: "Use it like a website, or install it to your home screen.",
  },
  {
    icon: Languages,
    title: "15 languages",
    description:
      "The entire interface is translated into 15 languages. Switch the UI language anytime from the top bar — it’s saved per device.",
    howToUse: "Switch the UI language from the top bar — it’s saved per device.",
  },
];