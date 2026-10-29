# Song sources

Raw material for the Raga Tiles songs in `public/songs/`. Only public-domain or self-made music goes here.

## Jana Gana Mana

- **Melody:** Rabindranath Tagore (public domain).
- **Source:** the score harmonized by Herbert Murrill, approved by the Constituent Assembly of India on 24 January 1950, as published (public domain, PD-India) on Wikimedia Commons:
  <https://commons.wikimedia.org/wiki/File:Audio_generated_from_score_of_Jana_Gana_Mana_harmonized_by_Herbert_Murrill.ogg>
- `jana-gana-mana.murrill.ly.txt`: the full score from that page (LilyPond notation).
- `jana-gana-mana.melody.ly`: its top voice only (the melody), in LilyPond `\relative c''` notation, 4/4.
- `jana-gana-mana.mid`: made from the melody with

  ```bash
  node scripts/lilypond-melody-to-midi.js songs-src/jana-gana-mana.melody.ly songs-src/jana-gana-mana.mid --relative "c''" --seconds 52
  ```

  The score has no tempo mark; 52 seconds is the official playing time of the full anthem, so the tempo comes out at about 125 beats per minute.
- The game file was made with `npm run song -- songs-src/jana-gana-mana.mid --preset anthem --source "…"`.

To use a different MIDI of the anthem instead, run `npm run song -- your-file.mid --preset anthem` (it overwrites `public/songs/jana-gana-mana.json`).
