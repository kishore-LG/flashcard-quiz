# Flashcard Quiz App

A responsive full-stack flashcard study application built with **Python Flask**, **SQLite**, HTML, CSS and JavaScript.

## Features
- Dashboard with total cards, known cards, revision cards and progress.
- Add, edit, delete and search flashcards.
- Organize cards by subject/category.
- Study mode with show-answer flip, previous/next navigation and card counter.
- Study all cards or shuffle the deck.
- Mark each card as Known or Need Revision.
- Progress persists in SQLite after refresh/restart.
- Category filtering, dark mode and responsive layout.
- Reset progress with confirmation.

## Requirements
- Python 3.9 or newer
- pip

## Run on Windows
1. Extract the ZIP file.
2. Open the extracted `flashcard_quiz_app` folder.
3. Open Command Prompt in that folder.
4. Create a virtual environment (recommended):

   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

5. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

6. Start the application:

   ```bash
   python app.py
   ```

7. Open this address in your browser:

   `http://127.0.0.1:5000`

## Run on macOS / Linux
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```
Then visit `http://127.0.0.1:5000`.

## Database
SQLite database `instance/flashcards.db` is created automatically the first time the app starts. Keep this file to preserve your cards and progress. Do not delete the `instance` folder if you want to retain your data.

## Project structure
```text
flashcard_quiz_app/
├── app.py
├── requirements.txt
├── README.md
├── templates/
│   └── index.html
└── static/
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

## Notes
- This starter project is intended to run locally on your computer.
- The Flask development server is for learning and local testing, not public production hosting.
