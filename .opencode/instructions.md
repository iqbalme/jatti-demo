<!-- session-tracker -->
At the start of EVERY session:
1. Read `todo.md` and `done.md` from the project root
2. Summarize to the user what was done previously and what remains

During the session:
- When a NEW task is discovered → append to `todo.md` directly as `- [ ] task description`
- When a task is STARTED → replace with `- [ ] **IN PROGRESS**: task description` and move to top of todo list
- When a task is COMPLETED → move the line from `todo.md` to `done.md` under the current date heading

CRITICAL: You MUST write to `todo.md` and `done.md` files directly. Do NOT use the `todowrite` tool — it only stores tasks in memory and does not persist them to the files. Only by writing to the files will tasks survive between sessions.

At session end:
1. Review `todo.md` — make sure all items are accurate
2. Review `done.md` — ensure all completed items are recorded
3. If applicable, append a `## Handoff Notes` section at the bottom of `done.md`
<!-- session-tracker -->
