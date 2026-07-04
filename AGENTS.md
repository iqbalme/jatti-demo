<!-- session-tracker -->
Selain update `todo.md` dan `done.md`, update juga `guide.md` jika ada perubahan fitur, konfigurasi, perintah, atau arsitektur yang perlu didokumentasikan (misal: script baru, environment variable baru, struktur test, dll).

At the start of EVERY session:
1. Load the `session-tracker` skill using the `skill` tool
2. Read `todo.md` and `done.md` from the project root
3. Summarize to the user what was done previously and what remains

During the session:
- When a NEW task is discovered → append to `todo.md` directly as `- [ ] task description`
- When a task is STARTED → replace with `- [ ] **IN PROGRESS**: task description` and move to top of todo list
- When a task is COMPLETED → move the line from `todo.md` to `done.md` under the current date heading

CRITICAL: You MUST write to `todo.md` and `done.md` files directly. Do NOT use the `todowrite` tool — it only stores tasks in memory and does not persist them to the files. Only by writing to the files will tasks survive between sessions.

At session end:
1. Review `todo.md` — make sure all items are accurate
2. Review `done.md` — ensure all completed items are recorded
3. Append a `## Handoff Notes` section at the bottom of `done.md` summarizing what was accomplished and what the next session should focus on
<!-- session-tracker -->
