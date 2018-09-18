from flask import Flask, Response
import uuid

app = Flask(__name__)


@app.route("/")
def hello():
    return Response(str(uuid.uuid4()), status=200, mimetype='text/plain')


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)