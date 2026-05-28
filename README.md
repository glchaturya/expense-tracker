# Expense Tracker

Static multi-page frontend app (HTML/CSS/JS) — localStorage-backed demo.

Pages:
- `index.html` — Dashboard
- `goal.html` — Goal Booster
- `spending.html` — Spending Analysis

How to run locally:
1. Open the `workspace` folder in your editor or file explorer.
2. Open `index.html` in your browser (double-click) or serve with a static server:

```bash
# using python
python -m http.server 8000
# then open http://localhost:8000/index.html
```

Deploy to Netlify:
- Create a new site on Netlify and drag the `workspace` folder (or the built site root) to deploy.
- Or connect a Git repository and set the publish directory to the repository root.

Notes:
- Data is stored in `localStorage` under key `expense-tracker:data:v1`.
- No backend included; this is a client-only demo intended to mirror the UI you provided.

