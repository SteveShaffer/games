# TODO — Shaffer Family Games

This file tracks upcoming features, investigations, and improvements across the repository. AI agents should check this list when deciding what to work on next and mark items `[x]` as they are completed.

## Daily Gauntlet (`gauntlet/`)

- [ ] Expand the list of possible games from 10 to ~25 (still 5 games per day; currently at 10 games: `Word`, `Digits`, `Flip`, `Pairs`, `Slide`, `Waffle`, `Jam`, `Morph`, `Code`, `Ice`)
- [ ] Consider games based on miniaturized/abbreviated versions of some popular turn-based games. Ideas include: the card game Set, Pokemon cards (or some generic version of that? not really sure tbh...), chess endgames, Battleship, ...
- [x] Check whether Flip is always possible to win. Is it possible to generate unbeatable boards? If so, how might we adjust the logic to make it so those boards can't be generated?
- [x] Verify solvability across all 10 games (procedurally generated + BFS-verified `Jam` boards in 6–10 moves, BFS-verified `Ice` / `Morph` / `Slide` / `Digits`, no-duplicate 4-peg secret codes in `Code`)
- [x] Save mid-stage board state (`stage.savedState`) to `localStorage` across all 10 games so refreshing mid-puzzle restores all submitted rows/moves
- [x] Fix `Code` (Mastermind) and `Word` (Wordle) vertical layout: full-height scrollable row history (`.mm-history`, `.wordle-board`), container-query (`cqh`/`cqw`) tile sizing for `Word`, and `Submit` button positioned below the input buttons in `Code`
- [x] Convert the "turns remaining" counter into a segmented Turn Health Bar (`#turnHealthFill`) that drains and changes color as turns are spent
- [x] Normalize all 10 games to crisp one-word names (`Word`, `Digits`, `Flip`, `Pairs`, `Slide`, `Waffle`, `Jam`, `Morph`, `Code`, `Ice`) and calculate + display `Par` (in turns) for every game
- [x] Restrict `Word` inputs to valid 5-letter English words (`WORDLE_VALID_SET`, 14,734 words), expand `Word` targets (`WORDLE_TARGETS`) to 2,300 everyday English words, and expand `Slide` scrambles to 7–10 steps (filtered to 5–8 BFS moves)
- [ ] Slide is not obvious to users.  They don't understand what happens when they click on something.  Can we add arrows to the movable pieces so they see which way they would slide?
- [ ] Code (Mastermind) is a little confusing to the uninitiated.  Particularly the 4 dots not corresponding to their respective code pegs in any particular order.  Can we make it more obvious how the feedback works?
- [ ] Add end-to-end regression tests for basic playability of the games
- [ ] Add unit tests for the random but deterministic generation of the games
- [x] Add a proper static site build system (but still work with GitHub Pages static hosting, likely by using Github Actions and a separate branch of the finished build or I'm open to better suggestions)
- [x] Refactor into subfolders, one for each game.  With shared libraries for shared stuff
