# Puzzle sources

- `puzzles.json`: the list of puzzles (edit / add here). `npm run puzzles` (and every `npm run build`) verifies
  them all and writes `public/puzzles/puzzles.json` for the game. Fields: `id`, `fen`, `type` (`mate1`/`mate2`/`mate3`),
  optional `solution` (UCI moves), `source` ({ player, event, year, note }: real games only), `levelOverride` (1–15).
- Put PGN files of real games here (e.g. Anand's or Gukesh's games), then:
  `npm run puzzles:pgn -- puzzle-sources/anand.pgn --scan` (or `--move 31 [--side b]`), and add `--add` to save.
- `npm run puzzles:generate` constructs more original positions if a level runs short.
