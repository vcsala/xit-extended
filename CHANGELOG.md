# Change Log

All notable changes to the "xit-extended" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added

- Showing warnings on item issues (e.g., invalid checkbox state, wrong date, etc.)

## [0.1.0] - 2022-09-15

Initial alpha release based on tscpp's [xit extension](https://github.com/tscpp/xit-vscode).

### Added

- Sorting by due date (ascending) and priority (descending)
- Remove completed and obsolete tasks
- Increase and decrease priority of the selected tasks
- Folding (groups and multiline items)
- Showing the groups in the Outline view
- Showing warnings on formatting issues (e.g., wrongly idented multiline tasks, etc.) following the [xit! specification](https://github.com/jotaen/xit/blob/main/Specification.md)
- Editor context menu for the available commands

### Changed

- Syntax highlighting of dates (adding weeks)
