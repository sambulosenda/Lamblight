import { describe, expect, it } from "vitest";
import { followingTrack } from "../src/lib/audio-player";
import type { AudioTrack } from "../src/lib/audio-types";

const track = (key: string, href: string): AudioTrack => ({ key, title: "", url: `https://audio.example/web/${key.replace(".", "/")}.mp3`, href, duration: 300 });

describe("followingTrack", () => {
  it("goes to the next chapter in the book", () => {
    expect(followingTrack(track("JHN.3", "/web/john/3"))).toMatchObject({ key: "JHN.4", title: "John 4", url: "https://audio.example/web/JHN/4.mp3", href: "/web/john/4", duration: 0 });
  });
  it("crosses into the next book", () => {
    expect(followingTrack(track("MAL.4", "/web/malachi/4"))).toMatchObject({ key: "MAT.1", url: "https://audio.example/web/MAT/1.mp3", href: "/web/matthew/1" });
  });
  it("uses Psalm for a single psalm", () => {
    expect(followingTrack(track("PSA.22", "/web/psalms/22"))?.title).toBe("Psalm 23");
  });
  it("stops after Revelation", () => {
    expect(followingTrack(track("REV.22", "/web/revelation/22"))).toBeNull();
  });
});
