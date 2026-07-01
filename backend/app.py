import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from extensions import db


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")

    CORS(app)
    db.init_app(app)
    JWTManager(app)

    @app.route("/health")
    def health():
        return jsonify({"status": "ok"})

    from routes.auth import auth_bp
    from routes.properties import properties_bp
    from routes.zones import zones_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(properties_bp, url_prefix="/properties")
    app.register_blueprint(zones_bp, url_prefix="/properties")

    with app.app_context():
        import models  # noqa: F401 - registers models before create_all()
        db.create_all()
        from seed import run_seed
        run_seed(db)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)