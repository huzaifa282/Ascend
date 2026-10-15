I tested the running debug build and found the problems below. Fix all of them, in priority order. Read the relevant code before changing it, and don't redesign anything beyond what's needed. For each item, find the root cause, fix it, and check it in the running app. When you're done, give me a short table: item # → root cause → files changed → how you verified it. If an item needs a product decision, explain the options, skip it, and continue with the rest.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
P0 — BROKEN CORE FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Command bar silently drops input.
   Typing "add task: test task from review" and pressing Enter clears the field, but no task is created, nothing shows in History → Log, and no error appears. The model key is currently invalid (BAD_KEY), which is probably why it fails, but the failure is swallowed.
   Fix: never lose input. On failure, keep or restore the text and show a clear inline error or toast with the reason and a link to Settings → Model. Add a local fallback so obvious prefixes ("add task:", "task:", "todo:") create a task without the LLM.

2. Focus timer never starts.
   In the Focus timer dialog (opened from the Today card), the middle control does nothing; it stays at 25:00. The play button on the pill widget doesn't start it either. The three controls (square, bar, plus) have no labels or tooltips, and the middle icon looks like a broken glyph.
   Fix: make start, pause and stop work from the dialog, the Today card and both widgets. Use clear icons with tooltips and aria-labels. Keep timer state in one shared store so the main window and both widgets show the same live countdown.

3. Model settings don't persist.
   Gemini was selected with a key entered (Test connection → BAD_KEY). After leaving Settings and coming back, no provider was selected. Re-selecting Gemini showed an empty API key field.
   Fix: save the provider, key and model, and load them back on mount. Show the saved key masked. Make the key placeholder match the provider (Gemini uses "AIza…", not "sk-…"). Show the last connection-test result next to the button.

4. Attribute points without any history.
   Status shows attribute values (STR 1, END 1, AGI 1, VIT 11, INT 2, FOC 2, CRE 4, CHA 4, DIS 11), but XP is 0/250, XP today is +0, System feed says "Nothing yet." and History → Log says "Nothing logged yet."
   Fix: find where these points come from (seed or test data, or awards written without a log entry). Every stat change must come from a logged event, and a fresh profile must start clean.

5. Weekly report shows a 100% on-time rate with 0 quests.
   Divide-by-zero fallback. Show "—" when there are no quests, and keep "The System's review" text from claiming a 100% rate. "Best day +0" should also read as empty.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
P1 — WIDGET WINDOWS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. Both widget windows can be on screen at once.
   The compact pill and the expanded panel showed together, overlapping. Expanding from the pill hides the pill, but collapsing the expanded panel shows the pill without hiding the panel.
   Fix: only one widget window visible at a time. Respect Settings → Widget → Default size (currently Expanded) on launch.

7. Widgets can't be dragged.
   Dragging the header of either widget does nothing. Because they're always on top, they cover the main window's sidebar. Add a proper drag region and remember each widget's position between launches.

8. Expanded widget layout is broken:
   - The "ASCENDANT" header bar overlaps the "Level 1 / Rank E" row.
   - The 10 HP blocks overflow past the right edge.
   - The music card wraps "Nothing playing / START ANY PLAYER" one word per line, and OPEN FOLDER is cut off.
   - A horizontal scrollbar appears near the bottom.
   - The quick-log input is cut off, and the "CTRL…" hint is clipped.
   Fix: no horizontal overflow at the widget's width. Shrink or wrap the contents properly, and give the HP bar a label.

9. Pill widget:
   - A dark rounded shape renders behind the play button.
   - There's no time display.
   - It's unclear whether play controls music or the timer.
   - None of the widget icon buttons (open app, pin, expand/collapse, close) have tooltips.
   - The pin button gives no visible feedback when clicked.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
P1 — VISUAL BUGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. Every toggle switch renders wrong.
    They show as a tall upright capsule or a bare circle instead of a horizontal switch, so on and off can't be told apart. Seen in Settings → Notifications, Widget, Music and focus, Appearance (Reduced motion), the Music page and the Focus timer dialog. Probably a missing width or a flex-shrink/squash issue in the shared Switch component. Fix it once, in that component.

11. Appearance → Accent: the color circles touch or overlap, and the selected ring sits off-center at the top-left of the blue circle. Add spacing and center the ring.

12. Settings → Data sharing:
    - "INTERPRETATION FEEDBACK" overflows its segmented control.
    - "SEND REVIEWED ITEMS" and "DELETE PREVIOUSLY SHARED DATA" are wider than the card above them.

13. The Today focus card shows "--:--" while the widget shows 25:00 and the default length is 25 minutes. Show the real idle time (default length) and a start control.

14. The Today music card wraps "Nothing playing / START ANY PLAYER" into a narrow column. The Music menu item uses a document icon instead of a music icon, and the music card uses the same document icon.

15. The main window uses the light native Windows title bar on a dark app. Use a dark or custom title bar. When maximized, the content stays a narrow centered column with large empty areas; make the layout use the space sensibly.

16. Settings content shifts a few pixels sideways on pages tall enough to scroll (Notifications, Music and focus) because the scrollbar appears. Use scrollbar-gutter: stable or an equivalent.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
P2 — UNFINISHED AND INCONSISTENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. Developer text shown to users:
    - Quests → This Week: "This week's view groups the same open tasks by due date (phase 7 polish)."
    - Settings → Voice, Stats and Ruleset tuning: "Built out further in a later phase."
    Fix: replace with a proper "Coming soon" empty state, or hide these sections until they're built.

18. The Quests page has no way to add a task, daily or main quest. Dailies shows "0 OF 0 DONE" with no empty state. "REST TODAY" has no explanation or confirmation. Add create buttons, empty states, and a tooltip or confirm for Rest Today.

19. History → Calendar isn't a calendar; it's the same XP line chart as Status. The ranges also disagree: History says "30 DAYS AGO" and Status → XP per day says "61 DAYS AGO". Build a real calendar or heatmap, and make the ranges consistent.

20. History → Titles is completely blank. Add an empty state.

21. Status → the 10-block bar with "100/100" has no label. Label it HP and give it a tooltip explaining how HP works.

22. Ask the System:
    - "What is left today?" says it needs a connected model, even though the answer is local data. Answer simple local questions without the LLM.
    - The System feed and Ask the System page has no "← Back to Status" link, unlike Skills and Weekly report.

23. Settings → Hotkey shows the raw accelerator "CommandOrControl+Shift+Space", while the command bar shows "CTRL+SHIFT+SPACE". Format it for display per platform.

24. Settings for features that aren't built yet look active:
    - "Lower music while dictating" is on, though Voice isn't built.
    - The "System media" toggle (coming later) doesn't look disabled.
    - Data sharing shows "Sharing endpoint not configured." to the user.
    Disable or hide what isn't available, and show proper disabled styling.

25. An empty black console window opens alongside the app. That's fine for debug, but make sure release builds set #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] in main.rs.