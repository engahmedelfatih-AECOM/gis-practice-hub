# 12 - Remaining accessibility and contrast items

![Packages register with the status chips](img/12-packages.png)

Current screen: Packages register with the status chips.

## Today

- Some status chips (yellow "In Progress", light green "Submitted") have low text contrast.
- Long register tables are slow to cross with the keyboard.

## The change

- Chip colours checked against WCAG AA, using only the AECOM tokens and their tints.
- A sticky first column and header, and keyboard shortcuts to jump between rows.
- A check in CI that fails on a new contrast problem.

## Benefit for the team

- Readable on a projector and for colleagues with low vision.
- Meets the AECOM digital standard before a wider roll-out.

## Effort and dependencies

- Effort: Small - 1 to 2 days
- Depends on: None.

## Needs your decision or confirmation

- Chip colours follow the workbook sheet colours today. A darker text on the same fill keeps the design intent; confirm if you prefer that to a new fill.
