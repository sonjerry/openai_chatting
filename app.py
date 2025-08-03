from flask import Flask, request, jsonify, render_template
from openai import OpenAI
from dotenv import load_dotenv
import os
import csv
from datetime import datetime
import re


load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")


client = OpenAI(api_key=api_key)

#
basedir = os.path.abspath(os.path.dirname(__file__))


with open(os.path.join(basedir, "prompt_normal.txt"), "r", encoding="utf-8") as f:
    PROMPT = f.read()


app = Flask(__name__)

#HTML 렌더링
@app.route('/')
def index():
    return render_template("chat.html")

# 대화내역 저장
def save_message_csv(username, role, message):
    log_path = os.path.join(basedir, "chatting_log.csv")
    with open(log_path, "a", newline='', encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([datetime.now().isoformat(), username, role, message])

# 채팅 처리
@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = sanitize(data.get("message", ""))
    history = data.get("history", [])
    username = sanitize(data.get("name", "사용자"))

    messages = [{"role": "system", "content": PROMPT}] + history
    messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            temperature=0.95,
            frequency_penalty=0.4,
            presence_penalty=0.5,
            max_tokens=300
        )

        reply = response.choices[0].message.content

        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": reply})

        save_message_csv(username, "user", user_message)
        save_message_csv(username, "assistant", reply)

        return jsonify({
            "reply": reply,
            "history": history
        })

    except Exception as e:
        import traceback
        print("오류 발생:", traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# 간단한 필터
def sanitize(text):
    return re.sub(r'[<>"]', '', text)


if __name__ == '__main__':
    app.run(debug=True)
