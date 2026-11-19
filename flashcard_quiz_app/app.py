from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import random

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///flashcards.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

class Flashcard(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(80), nullable=False, default="General")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Progress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    card_id = db.Column(db.Integer, db.ForeignKey("flashcard.id"), unique=True, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="revision")

with app.app_context():
    db.create_all()

def card_json(card):
    progress = Progress.query.filter_by(card_id=card.id).first()
    return {
        "id": card.id, "question": card.question, "answer": card.answer,
        "category": card.category, "created_at": card.created_at.strftime("%d %b %Y"),
        "status": progress.status if progress else "new"
    }

@app.route("/")
def index():
    return render_template("index.html")

@app.get("/api/cards")
def get_cards():
    category = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip()
    query = Flashcard.query
    if category and category != "All":
        query = query.filter_by(category=category)
    if search:
        like = f"%{search}%"
        query = query.filter(db.or_(Flashcard.question.ilike(like), Flashcard.answer.ilike(like), Flashcard.category.ilike(like)))
    cards = query.order_by(Flashcard.created_at.desc()).all()
    return jsonify([card_json(c) for c in cards])

@app.post("/api/cards")
def add_card():
    data = request.get_json(silent=True) or {}
    question, answer = (data.get("question") or "").strip(), (data.get("answer") or "").strip()
    category = (data.get("category") or "General").strip() or "General"
    if not question or not answer:
        return jsonify({"error": "Question and answer are required."}), 400
    card = Flashcard(question=question, answer=answer, category=category)
    db.session.add(card)
    db.session.commit()
    return jsonify(card_json(card)), 201

@app.put("/api/cards/<int:card_id>")
def edit_card(card_id):
    card = db.session.get(Flashcard, card_id)
    if not card:
        return jsonify({"error": "Flashcard not found."}), 404
    data = request.get_json(silent=True) or {}
    question, answer = (data.get("question") or "").strip(), (data.get("answer") or "").strip()
    if not question or not answer:
        return jsonify({"error": "Question and answer are required."}), 400
    card.question, card.answer = question, answer
    card.category = (data.get("category") or "General").strip() or "General"
    db.session.commit()
    return jsonify(card_json(card))

@app.delete("/api/cards/<int:card_id>")
def delete_card(card_id):
    card = db.session.get(Flashcard, card_id)
    if not card:
        return jsonify({"error": "Flashcard not found."}), 404
    Progress.query.filter_by(card_id=card_id).delete()
    db.session.delete(card)
    db.session.commit()
    return jsonify({"success": True})

@app.post("/api/cards/<int:card_id>/progress")
def set_progress(card_id):
    if not db.session.get(Flashcard, card_id):
        return jsonify({"error": "Flashcard not found."}), 404
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in ("known", "revision"):
        return jsonify({"error": "Invalid progress status."}), 400
    progress = Progress.query.filter_by(card_id=card_id).first()
    if not progress:
        progress = Progress(card_id=card_id, status=status)
        db.session.add(progress)
    else:
        progress.status = status
    db.session.commit()
    return jsonify({"success": True, "status": status})

@app.post("/api/progress/reset")
def reset_progress():
    Progress.query.delete()
    db.session.commit()
    return jsonify({"success": True})

@app.get("/api/stats")
def stats():
    total = Flashcard.query.count()
    known = Progress.query.filter_by(status="known").count()
    revision = Progress.query.filter_by(status="revision").count()
    percent = round((known / total) * 100) if total else 0
    categories = db.session.query(Flashcard.category, db.func.count(Flashcard.id)).group_by(Flashcard.category).all()
    return jsonify({
        "total": total, "known": known, "revision": revision,
        "new": max(total - known - revision, 0), "percent": percent,
        "categories": [{"name": name, "count": count} for name, count in categories]
    })

@app.get("/api/random")
def random_card():
    cards = Flashcard.query.all()
    if not cards:
        return jsonify({"error": "Add a flashcard to start studying."}), 404
    return jsonify(card_json(random.choice(cards)))

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
