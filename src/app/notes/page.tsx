import type { Metadata } from "next";
import { NotesLibrary } from "@/components/NotesLibrary";

export const metadata: Metadata = {
  title: "My highlights and notes",
  description: "Every verse you have highlighted or written a note on, kept on this device.",
  robots: { index: false, follow: true },
};

export default function NotesPage() {
  return (
    <main id="content" className="notes-page">
      <NotesLibrary />
    </main>
  );
}
