function conversionAmount(currentObject, dimension){
    if (currentObject.geometry.type == "BoxGeometry"){
        switch (dimension) {
            case "x":
                return currentObject.geometry.parameters.width / 2;
            case "y":
                return currentObject.geometry.parameters.height / 2;
            case "z":
                return currentObject.geometry.parameters.depth / 2;
        }
    } else if (currentObject.geometry.type == "SphereGeometry"){
        switch (dimension) {
            case "x":
                return currentObject.geometry.parameters.radius;
            case "y":
                return currentObject.geometry.parameters.radius;
            case "z":
                return currentObject.geometry.parameters.radius;
        }
    } else if (currentObject.geometry.type == "CylinderGeometry" || currentObject.geometry.type == "ObliqueCylinderGeometry"){
        const radius = Math.max(currentObject.geometry.parameters.radiusBottom,
                                currentObject.geometry.parameters.radiusTop);
        switch (dimension) {
            // Because cylinders are rotated, the height now refers to it's length along the x-axis
            case "x":
                return currentObject.geometry.parameters.height / 2;;
            case "y":
                return radius
            case "z":
                return radius;
        }
    } else if (currentObject.geometry.type == "IBeamGeometry" || currentObject.geometry.type == "CBeamGeometry"){
        switch (dimension) {
            case "x":
                return currentObject.geometry.parameters.width / 2;
            case "y":
                return currentObject.geometry.parameters.h / 2;
            case "z":
                return currentObject.geometry.parameters.b / 2;
        }
    } else if (currentObject.geometry.type == "TrapezoidGeometry"){
        switch (dimension) {
            case "x":
                return currentObject.geometry.origLocation.x;
            case "y":
                return currentObject.geometry.origLocation.y;
            case "z":
                return currentObject.geometry.origLocation.z;
        }
    }
}


function glToJson(currentObject, dimension, value){
    return value - conversionAmount(currentObject, dimension);
}


function jsonToGl(currentObject, dimension, value){
    return value + conversionAmount(currentObject, dimension);
}


export {glToJson, jsonToGl};