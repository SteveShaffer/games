# TODO — Shaffer Family Games

This file tracks upcoming features, investigations, and improvements across the repository. AI agents should check this list when deciding what to work on next and mark items `[x]` as they are completed.

## Daily Gauntlet (`gauntlet/`)

- [x] Expand the list of possible games from 10 to 15 curated games (still 5 games per day; 10 original: `Word`, `Digits`, `Flip`, `Pairs`, `Slide`, `Waffle`, `Jam`, `Morph`, `Code`, `Ice` + 5 kept new games: `Chess`, `Sudoku`, `Mines`, `Knight`, `Bridges`; culled time-based, fixed-turn, cryptic, or low-variety prototypes and documented the 4 Gauntlet Mini-Game Design Principles in `AGENTS.md`)
- [x] Consider games based on miniaturized/abbreviated versions of some popular turn-based games (`Chess` royal capture, `Sudoku` 4×4, `Mines` logic sweeper, `Knight` star path, and procedurally generated `Bridges` / *Hashi*)
- [x] Check whether Flip is always possible to win. Is it possible to generate unbeatable boards? If so, how might we adjust the logic to make it so those boards can't be generated?
- [x] Verify solvability across all 10 games (procedurally generated + BFS-verified `Jam` boards in 6–10 moves, BFS-verified `Ice` / `Morph` / `Slide` / `Digits`, no-duplicate 4-peg secret codes in `Code`)
- [x] Save mid-stage board state (`stage.savedState`) to `localStorage` across all 10 games so refreshing mid-puzzle restores all submitted rows/moves
- [x] Fix `Code` (Mastermind) and `Word` (Wordle) vertical layout: full-height scrollable row history (`.mm-history`, `.wordle-board`), container-query (`cqh`/`cqw`) tile sizing for `Word`, and `Submit` button positioned below the input buttons in `Code`
- [x] Convert the "turns remaining" counter into a segmented Turn Health Bar (`#turnHealthFill`) that drains and changes color as turns are spent
- [x] Normalize all 10 games to crisp one-word names (`Word`, `Digits`, `Flip`, `Pairs`, `Slide`, `Waffle`, `Jam`, `Morph`, `Code`, `Ice`) and calculate + display `Par` (in turns) for every game
- [x] Restrict `Word` inputs to valid 5-letter English words (`WORDLE_VALID_SET`, 14,734 words), expand `Word` targets (`WORDLE_TARGETS`) to 2,300 everyday English words, and expand `Slide` scrambles to 7–10 steps (filtered to 5–8 BFS moves)
- [x] Slide is not obvious to users.  They don't understand what happens when they click on something.  Can we add arrows to the movable pieces so they see which way they would slide?
- [x] Code (Mastermind) is a little confusing to the uninitiated.  Particularly the 4 dots not corresponding to their respective code pegs in any particular order.  Can we make it more obvious how the feedback works?
- [x] Add end-to-end regression tests for basic playability of the games
- [x] Add unit tests for the random but deterministic generation of the games
- [x] Add a proper static site build system (but still work with GitHub Pages static hosting, likely by using Github Actions and a separate branch of the finished build or I'm open to better suggestions)
- [x] Refactor into subfolders, one for each game.  With shared libraries for shared stuff
- [ ] Add an explanation modal for first-time users explaining how the gauntlet is played. Store whether they've seen this modal in localStorage so they only see it the first time they visit. But store a date or version number of something. So that after we make a significant change to the game we can increment the version number and force all users to see the new explanation modal.
- [ ] Remove any duplicate sources of truth in the final build.  At the moment, we're building everything into index.html (checked into source) and then also building it again in GitHub actions and pushing to some github pages repository (that i'm not familiar with). The risk is things get out of sync. We should just have at most a local build (if needed) and a production build and neither should be checked in to source on master. I'm not sure if that means we need a separate github pages branch for posting the build or not.
