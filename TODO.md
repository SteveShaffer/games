# TODO — Shaffer Family Games

This file tracks upcoming features, investigations, and improvements across the repository. AI agents should check this list when deciding what to work on next and mark items `[x]` as they are completed.

## Daily Gauntlet (`gauntlet/`)

- [ ] Expand the list of possible games from 10 to ~25 (still 5 games per day; currently at 10 games: Wordle, Digits, Flip Grid, Pairs, Tile Slide, Waffle, Traffic Jam, Word Morph, Mastermind, Ice Slide)
- [ ] Consider games based on miniaturized/abberviated versions of some popular turn-based games. Ideas include: the card game Set, Pokemon cards (or some generic version of that? not really sure tbh...), chess endgames, Battleship, ...
- [x] Check whether Flip is always possible to win. Is it possible to generate unbeatable boards? If so, how might we adjust the logic to make it so those boards can't be generated?
- [ ] Slide is not obvious to users.  They don't understand what happens when they click on something.  Can we add arrows to the movable pieces so they see which way they would slide?
- [ ] Mastermind is a little confusing to the uninitiated.  Particularly the 4 dots not corresponding to their respective code pegs in any particular order.  Can we make it more obvious how the feedback works?
- [ ] Add end-to-end regression tests for basic playability of the games
- [ ] Add unit tests for the random but deterministic generation of the games
- [ ] Add a proper static site build system (but still work with GitHub Pages static hosting, likely by using Github Actions and a separate branch of the finished build or I'm open to better suggestions)
- [ ] Refactor into subfolders, one for each game.  With shared libraries for shared stuff
