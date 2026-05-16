# Dead-code pass

This pass removes the vestigial click-based arrangement copy mode that was superseded by direct clip drag-copy and explicit Copy/Paste controls.

## Removed

- Persisted `arrangementCopyMode` and `arrangementCopySourceStep` state.
- The no-op copy-mode toggle path.
- The old section-paste helper that depended on a copy-source scene.
- Reset calls that only cleared the removed mode.
- The `copy-source` arrangement step marker.
- Unused `.arrangement-copy` and `.arrangement-step-label.copy-source` CSS selectors.

## Preserved

- Drag-copy for A/V, TEXT, and DRUM clips.
- Explicit arrangement Copy, Paste, Delete, Capture, and Fill buttons.
- Scene-level copy/paste behavior.
- The arrangement clipboard state used by the current copy/paste system.
