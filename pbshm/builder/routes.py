from flask import Blueprint, render_template
from pbshm.authentication.authentication import authenticate_request

# Create the tools blueprint
bp = Blueprint(
    "builder", 
    __name__, 
    template_folder="templates",
    static_folder="static"
)

# Build Route
@bp.route("/")
@authenticate_request("builder-model")
def build_model():
    return render_template("build-model.html")