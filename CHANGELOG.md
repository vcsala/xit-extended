# Change Log

All notable changes to the "xit-extended" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.1.3] - 2022-09-15

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
