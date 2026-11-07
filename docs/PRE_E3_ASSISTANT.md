# Pre-E3 assistant, API and GitHub

**Panels → API** opens the searchable reference. The JSON index is available at GET /v1/api/reference and individual chapters or commands are available by ID with the same editor authorization as the tool catalog.

**Config → Config AI assistant** inherits the connected Platform provider and defaults. The project may override model, reasoning, instructions and limits. Refreshing the model list uses no generation tokens. **Test selected model** makes one short provider request and records reported usage. Settings and provider-reported usage are stored alongside the CAD project. **Talk to AI assistant** opens chat in the right dock. The top AI indicator opens chat when connected and opens configuration otherwise. Enter sends and Shift+Enter inserts a newline. The attachment control accepts the current CAD orthographic SVG format.

Under **More info**, use **Share current CAD context** for CAD reads and proposals. The assistant receives open tabs, recent focus, semantic IDs and the chosen selection summary. An attached SVG is provided to local CAD tools. A model can request bounded tool results. With **Require confirmation** enabled, approve the plan or send feedback. CAD changes run in an isolated proposal. The toolbar and chat both provide preview, MAIN, review/apply and discard. Compare the exact candidate geometry and drawing. Final application uses the existing human diff review and a verified MAIN revision.

**Config GitHub** inherits the Platform account. It supports repository discovery and creation, branch association and creation, reviewing a saved self-contained snapshot, guarded publication, history and reconciliation. The account is managed in Platform. CAD uses explicit snapshot publication. Game Engine’s automatic milestone publication and agent publication are outside this implementation. The review branch is read-only and supports exact Model/Drawing comparison and feature tree inspection.

## Live evaluation

Select **gpt-5.6-luna** and **medium** if exposed by the connected provider. Use a supported single XY extrusion for model-to-drawing and a fresh native **E2.M4 Drawing Reconstruction** project for drawing-to-model. The SVG profile is documented in the API panel. The provider connection and both live runs require separate evidence. The tests use a synthetic provider and GitHub client through the actual Platform service bridge.
