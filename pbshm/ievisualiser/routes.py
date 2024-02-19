from bson.objectid import ObjectId
from flask import Blueprint, render_template, jsonify

from pbshm.authentication import authenticate_request
from pbshm.db import default_collection
from pbshm.timekeeper import nanoseconds_since_epoch_to_datetime

# Create the tools blueprint
bp = Blueprint(
    "ie-visualiser", 
    __name__, 
    template_folder="templates",
    static_folder="static"
)

# List Route
@bp.route("/")
@authenticate_request("ie-visualiser-list")
def list_models():
    # Load Models
    models = []
    for document in default_collection().find({"models":{"$exists":True}}):
        models.append({
            "id": document["_id"],
            "name": document["name"],
            "population": document["population"],
            "timestamp": document["timestamp"],
            "date": nanoseconds_since_epoch_to_datetime(document["timestamp"]).strftime("%d/%m/%Y %H:%M:%S"),
            "elements": len(document["models"]["irreducibleElement"]["elements"]) if "models" in document and "irreducibleElement" in document["models"] and "elements" in document["models"]["irreducibleElement"] else 0,
            "relationships": len(document["models"]["irreducibleElement"]["relationships"]) if "models" in document and "irreducibleElement" in document["models"] and "relationships" in document["models"]["irreducibleElement"] else 0
        })
    # Render
    return render_template("available-models.html", models=models)

# View Route
@bp.route("/model/<id>/view")
@authenticate_request("ie-visualiser-json")
def view_model(id):
    # Load Model
    models = []
    for document in default_collection().aggregate([
        {"$match":{"_id":ObjectId(id)}},
        {"$limit":1},
        {"$project":{
            "_id":0
        }}
    ]):
        models.append(document)
    return jsonify(models[0]) if len(models) > 0 else jsonify()

# Explore Route
@bp.route("/model/<id>/explore")
@authenticate_request("ie-visualiser-explore")
def explore_model(id):
    return render_template("explore-model.html", id=id)

# Build Route
@bp.route("/build", defaults={'id': ''})
@bp.route("/build/<id>/explore")
@authenticate_request("ie-visualiser-model")
def build_model(id):
    return render_template("build-model.html", id=id)