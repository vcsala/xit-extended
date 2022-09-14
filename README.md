# xit-extended

This extension provides support for handling tasks in [xit!](https://xit.jotaen.net/) format.

- [Syntax Highlighting](#syntax-highlighting)
- [Commands](#commands)
- [Shortcuts](#shortcuts)
- [Snippets](#snippets)
- [Completion](#completion)

## Syntax Highlighting

![screenshot showing the syntax highlighting](assets/screenshots/01.png)

### Customization

If the colors and looks of the syntax highlighting is not correct or as fancy as you want to, you can try to edit the `tokenColorCustomizations` in the user settings.

```json
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

### Strikethrough Not Working?

If closed tasks (completed/obsolete) are not striketroughed, then you may want to explicitly specify that the strikethrough scope is striketroughed. This is happening because your theme did not specify the striketrough rule.

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
- XIT: Sort - sort tasks in each group by their due date (ascending) and priority (descending).

## Shortcuts

The extension provides shortcuts for quickly editing task states, priorities, etc. The shortcuts are configured by default as shown below:

- `ctrl+space` - Toggle checkboxes if available, else trigger editor suggestions.
- `ctrl+alt+x` - Toggle all selected checkboxes.
- `ctrl+alt+d` - Shuffle all selected checkboxes. This will shift the checkbox state to `' ' -> '@' -> 'x' -> '~'`.
- `ctrl+up` - Increase priority of all selected tasks.
- `ctrl+down` - Decrease priority of all selected tasks (if possible).

## Snippets

- `u` - Unchecked (`[ ] `)
- `a`/`@` - Ongoing (`[@] `)
- `o`/`~` - Obsolete (`[~] `)
- `x` - Checked (`[x] `)
- `d` - Insert current date (in -> YYYY-MM-DD format)

## Completion

Typing `#`, the extensions offers the tags already exist in the file as a completion.
