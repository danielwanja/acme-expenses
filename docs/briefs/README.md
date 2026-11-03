# Briefs

Chapter 10 of *Coding with Claude* ("Ship the Whole Pie") hands Claude Code a
whole feature area in one long run on its own branch, steered by a written
brief. This folder is where that run starts (tag `ch10`):

- `finance-dashboard.md`: the chapter's example brief.
- `finance-goal.txt`: the `/goal` message on one line, for a headless run
  with a hard cap: `claude -p "$(cat docs/briefs/finance-goal.txt)" ...`.
- `../designs/finance/`: the three designs the brief points to
  (`queue.png`, `report.png`, `report-empty.png`), plain wireframes.

The run's output (`finance-dashboard.features.json`, the report file and the
code) is not part of this repository's history: the chapter lands it as
slices on your own branch. `.claude/settings.json` has the `SessionStart`
hook that puts `PROGRESS.md` back into context after a compaction.

Template: Appendix D of the book.
