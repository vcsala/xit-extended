# xit! extended

This extension provides support for handling tasks in [xit!](https://xit.jotaen.net/) format.

- [Syntax Highlighting](#syntax-highlighting)
- [Commands](#commands)
- [Context menu](#context-menu)
- [Shortcuts](#shortcuts)
- [Snippets](#snippets)
- [Completion](#completion)
- [Semantic Highlight](#semantic-highlight)
- [Configuration](#configuration)

## Syntax Highlighting

![screenshot showing the syntax highlighting](assets/screenshots/01.png)

### Color Theme

The extension is delivered with a color theme ([x]ìt! theme) included based on the Dark+ theme. It provides syntax highlighting for the semantic tokens used by the extension (see [Semantic Highlight](#semantic-highlight) below).

### Customization

If you are not using the included color theme and the colors and looks of the syntax highlighting is not correct or as fancy as you want to, you can try to edit the `tokenColorCustomizations` in the user settings.

```javascript
{
    "editor.tokenColorCustomizations": {
        "textMateRules": [{
            // Replace this with the scope you want to edit.
            // Available scopes are:
            // - markup.other.task.title.xit
            // - markup.other.task.checkbox.open.xit
            // - markup.other.task.checkbox.ongoing.xit
            // - markup.other.task.checkbox.checked.xit
            // - markup.other.task.checkbox.obsolete.xit
            // - markup.other.task.description.closed.xit
            // - markup.other.task.priority.xit
            // - markup.other.task.date.xit
            // - markup.other.task.date.overdue.xit
            // - markup.other.task.tag.xit
            "scope": "markup.other.task.checkbox.open.xit",
            "settings": {
                // Customize open checkbox color
                "foreground": "#00FF00",
                // ... and the fontStyle
                "fontStyle": "bold"
            }
        }]
    }
}
```

### Strike through Not Working?

If closed tasks (completed/obsolete) are not stroke trough, then you may want to explicitly specify that the strike through scope is stroke trough. This is happening because your theme did not specify the strike trough rule.

```json
{
    "editor.tokenColorCustomizations": {
        "[Theme That Is Not Working]": {
            "textMateRules": [
                {
                    "scope": "markup.strikethrough",
                    "settings": {
                        "fontStyle": "strikethrough"
                    }
                }
            ]
        }
    }
}
```

## Commands

There are several commands available to help users managing their tasks:

- XIT: Suggest (internal) - Toggle checkboxes if available, else trigger editor suggestions.
- XIT: Toggle Checkbox - Toggle all selected checkboxes.
- XIT: Shuffle Checkbox State - Shuffle all selected checkboxes. This will shift the checkbox state to `' ' -> '@' -> 'x' -> '~'`.
- XIT: Remove Completed and Obsolete - delete all obsolete and completed items.
- XIT: Sort by Due Date and Priority - sort tasks in each group by their due date (ascending) and priority (descending).
- XIT: Increase priority - increase the priority of the selected tasks.
- XIT: Decrease priority - decrease the priority of the selected tasks (if possible).
- XIT: Insert Current Day - insert current day (in -> YYYY-MM-DD format) at the cursor position
- XIT: Insert Current Week - insert current week (in -> YYYY-Wxx format) at the cursor position
- XIT: Insert Current Month - insert current month (in -> YYYY-MM format) at the cursor position
- XIT: Insert Current Quarter - insert current quarter (in -> YYYY-Qx format) at the cursor position
- XIT: Insert Current Year - insert current day (in -> YYYY format) at the cursor position
- XIT: Increase Date - increase the date with one period (e.g., if the due date is a month, for example 2022-10, it increase the date with one month)
- XIT: Decrease Date - decrease the date with one period (e.g., if the due date is a month, for example 2022-10, it decrease the date with one month)

## Context menu

All commands, except the XIT: Suggest command, is available in the editor context menu (right click on the document with the mouse).

## Shortcuts

The extension provides shortcuts for quickly editing task states, priorities, etc. The shortcuts are configured by default as shown below:

- `ctrl+space` - Toggle checkboxes if available, else trigger editor suggestions.
- `ctrl+alt+x` - Toggle all selected checkboxes.
- `ctrl+alt+d` - Shuffle all selected checkboxes. This will shift the checkbox state to `' ' -> '@' -> 'x' -> '~'`.
- `ctrl+up` - Increase priority of all selected tasks.
- `ctrl+down` - Decrease priority of all selected tasks (if possible).
- `ctrl-d ctrl-d` - Insert current day at the cursor position
- `ctrl-d ctrl-w` - Insert current week at the cursor position
- `ctrl-d ctrl-m` - Insert current month at the cursor position
- `ctrl-d ctrl-q` - Insert current quarter at the cursor position
- `ctrl-d ctrl-y` - Insert current year at the cursor position
- `ctrl-pageup` - Increase date
- `ctrl-pagedown` - Decrease date

If some of shortcuts are already used by your current keyboard settings you have to change / remap these functions to use them.

## Snippets

- `u` - Unchecked (`[ ] `)
- `a`/`@` - Ongoing (`[@] `)
- `o`/`~` - Obsolete (`[~] `)
- `x` - Checked (`[x] `)
- `d` - Insert current date (in -> YYYY-MM-DD format)

## Completion

Typing `#`, the extensions offers the tags already exist in the file as a completion.

## Semantic Highlight

A semantic tokenization is implemented, which helps to be more compliant with  the specification. The following semantic tokens are introduced which can be used in color themes:

- `title` - title lines
- `itemClosed` - The description of checked (completed) items
- `itemObsolete` - The description of obsolete items
- `checkboxOpen` - Open checkbox (`[ ] `)
- `checkboxOngoing` - Ongoing checkbox (`[@] `)
- `checkboxCompleted` - Checked (completed) checkbox (`[x] `)
- `checkboxObsolete` - Obsolete checkbox (`[~] `)
- `priority` - priority part of the description (only on open or ongoing items)
- `dueDate` - due date part of the description (only on open or ongoing items), where the due date is still in the future
- `dueDateOverdue` - due date part of the description (only on open or ongoing items), where the due date has been already passed
- `tag` - tags in description (only on open or ongoing items)
- `wrongToken` - lines which cannot be parsed (they do not follow the specification)

Below is a small example how to add this to your color theme (using `...` for brevity):

```json
	"semanticHighlighting": true,
	"semanticTokenColors": {
		"title": { "foreground": "#00ffff", "bold": true, "italic": false, "underline": true },
		"itemClosed": { "foreground": "#008e09", "bold": false, "italic": true, "underline": false, "strikethrough": true },
		"itemObsolete": ...,
		"checkboxOpen": ...,
		"checkboxOngoing": ...,
		"checkboxCompleted": ...,
		"checkboxObsolete": ...,
		"priority": ...,
		"dueDate": ...,
		"dueDateOverdue": ...,
		"tag": ...,
		"wrongToken": ...
	}
```

## Configuration

This extension provides configurations through VSCode's configuration settings. All configurations are under `xit-extended.*.`. 

At this moment, the configuration allows the user to decide if the items removed (by the XIT: Remove Completed and Obsolete command) are saved to a separate file. If yes, the user can also configure the name of the file (it is created in the same directory where the original *.xit file is opened from).

The user can also turn on and off the code lenses to show overdue items or items getting due today or tomorrow.

By default, the save flag is set to false. The default filename is `deleted.xit`.
