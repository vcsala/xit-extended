# Change Log

## [1.3.3] - 2022-11-16

Minor feature release.

### Changed

- Adding name of the weekday to the hover

### Known Issues

- Counters are not reliable if undo is used

## [1.3.1] - 2022-10-13

Bug fix release.

### Changed

- Fixing negative counters showing on the statusbar

### Known Issues

- Counters are not reliable if undo is used

## [1.3.0] - 2022-10-13

Feature release. More informative status on statusbar.

### Changed

- Changing the information on the statusbar, the number of the started (ongoing), completed and obsolete items at the given day for the given file (based on the filename)

## [1.2.1] - 2022-10-13

Feature release. Indicator added to the statusbar.

### Added

- Counter in the statusbar showing items closed (marked as completed or obsolete)

### Changed

- When inserting current period, space is removed before `->` (there was a space added in the previous version)

## [1.1.0] - 2022-10-13

Feature release. Implementing due date hover

### Added

- Showing the exact due date (last day of the defined period) as hover for ongoing and open tasks

## [1.0.0] - 2022-10-13

First major release.

### Added

- Configuration option to turn on/off diagnostics

## [0.4.2] - 2022-10-10

Feature release. Code lenses are added.

### Added

- Code lenses on overdue, due today and due tomorrow tasks
- Configuration option to turn on/off the code lenses

## [0.3.6] - 2022-10-10

Beta release. Bug fixes.

### Changed

- Various small bug fixes
- Shortcut changes

## [0.3.4] - 2022-10-09

Beta release. Color theme added.

### Added

- New color theme (based on the Dark+ theme) with the [x]it! semantic tokens

### Changed

- Code refactoring
- Various small bug fixes

## [0.3.0] - 2022-10-04

Beta release. Easier date handling.

### Added

- Commands, shortcuts and context menu items to insert current period (day, week, month, quarter or year)
- Commands, shortcuts and context menu items to increase or decrease the date

## [0.2.7] - 2022-09-29

Beta release. Configuration is added.

### Added

- Possibility to save the deleted items into a separate file
- User can configure if they want to save the items and what is the name of the file

## [0.2.3] - 2022-09-29

Beta release. Further improved semantic highlighting.

### Added

- Overdue dates are highlighted differently (using the `dueDateOverdue` semantic token)

## [0.2.0] - 2022-09-27

Beta release. Semantic highlighting is added for being more compliant with the specification.

### Changed

- Higlighting uses sematic rules

## [0.1.4] - 2022-09-20

Release to improve compliance with specification.

### Changed

- Syntax highlighting is more compliant with the specification
- Fixing wrong interpretation (e.g, representing quarters) of the specification

## [0.1.3] - 2022-09-20

Bug fix release.

### Added

- New warning if the file does not have a newline character at the end

### Changed

- Fixing issue loosing the last todo item if there is no newline character at the end of the file

## [0.1.1] - 2022-09-15

First alpha release based on tscpp's [xit extension](https://github.com/tscpp/xit-vscode).

### Added

- Sorting by due date (ascending) and priority (descending)
- Remove completed and obsolete tasks
- Increase and decrease priority of the selected tasks
- Folding (groups and multiline items)
- Showing the groups in the Outline view
- Showing warnings on formatting issues (e.g., wrongly idented multiline tasks, invalid dates, etc.) following the [xit! specification](https://github.com/jotaen/xit/blob/main/Specification.md)
- Editor context menu for the available commands

### Changed

- Syntax highlighting of dates (adding weeks)
