import {BufferAttribute, BufferGeometry} from 'three';


class TrapezoidGeometry extends BufferGeometry {
    constructor(leftTransY, leftTransZ, leftDimensY, leftDimensZ,
                rightTransY, rightTransZ, rightDimensY, rightDimensZ, width){

        super();

        this.type = 'TrapezoidGeometry';

        this.parameters = {
            leftTransY: leftTransY,
            leftTransZ: leftTransZ,
            leftDimensY: leftDimensY,
            leftDimensZ: leftDimensZ,
            rightTransY: rightTransY,
            rightTransZ: rightTransZ,
            rightDimensY: rightDimensY,
            rightDimensZ: rightDimensZ,
            width: width
        };

        const scope = this;

        // For working out translations to make the origin the centre of the geomtry
        // to be consistent with original ThreeJs geometries.
        const origX = width / 2;
        const origY = Math.max(leftTransY+leftDimensY, rightTransY+rightDimensY) / 2;  // height / 2
        const origZ = Math.max(leftTransZ+leftDimensZ, rightTransZ+rightDimensZ) / 2;  // depth / 2
        
        const [lay, laz, lby, lbz, lcy, lcz, ldy, ldz] = getFaceCoords(leftTransY, leftTransZ, leftDimensY, leftDimensZ);
        const [ray, raz, rby, rbz, rcy, rcz, rdy, rdz] = getFaceCoords(rightTransY, rightTransZ, rightDimensY, rightDimensZ);
        
        const vertices = [
        // front
        { pos: [-origX,     lay, laz], norm: [0, 0, 1], uv: [0, 0], },  // bottom left
        { pos: [origX, ray, raz], norm: [0, 0, 1], uv: [1, 0], },  // bottom right
        { pos: [-origX,     lby, lbz], norm: [0, 0, 1], uv: [0, 1], },  // top left
        { pos: [origX, rby, rbz], norm: [0, 0, 1], uv: [1, 1], },  // top right
        // right
        { pos: [origX, ray, raz], norm: [1, 0, 0], uv: [0, 0], },  // lower front (from the perspective of looking at the front)
        { pos: [origX, rdy, rdz], norm: [1, 0, 0], uv: [1, 0], },  // lower back
        { pos: [origX, rby, rbz], norm: [1, 0, 0], uv: [0, 1], },  // upper front
        { pos: [origX, rcy, rcz], norm: [1, 0, 0], uv: [1, 1], },  // upper back
        // back
        { pos: [origX, rdy, rdz], norm: [0, 0, -1], uv: [0, 0], },  // lower right (as if looking through the front still)
        { pos: [-origX,     ldy, ldz], norm: [0, 0, -1], uv: [1, 0], },  // lower left
        { pos: [origX, rcy, rcz], norm: [0, 0, -1], uv: [0, 1], },  // upper right
        { pos: [-origX,     lcy, lcz], norm: [0, 0, -1], uv: [1, 1], },  // upper left
        // left
        { pos: [-origX, ldy, ldz], norm: [-1, 0, 0], uv: [0, 0], },  // lower back (from the perspective of looking at the front)
        { pos: [-origX, lay, laz], norm: [-1, 0, 0], uv: [1, 0], },  // lower front
        { pos: [-origX, lcy, lcz], norm: [-1, 0, 0], uv: [0, 1], },  // upper back
        { pos: [-origX, lby, lbz], norm: [-1, 0, 0], uv: [1, 1], },  // upper front
        // top
        { pos: [origX, rcy, rcz], norm: [0, 1, 0], uv: [0, 0], },  // right back
        { pos: [-origX,     lcy, lcz], norm: [0, 1, 0], uv: [1, 0], },  // left back
        { pos: [origX, rby, rbz], norm: [0, 1, 0], uv: [0, 1], },  // right front
        { pos: [-origX,     lby, lbz], norm: [0, 1, 0], uv: [1, 1], },  // left front
        // bottom
        { pos: [origX, ray, raz], norm: [0, -1, 0], uv: [0, 0], },  // right front
        { pos: [-origX,     lay, laz], norm: [0, -1, 0], uv: [1, 0], },  // left front
        { pos: [origX, rdy, rdz], norm: [0, -1, 0], uv: [0, 1], },  // right back
        { pos: [-origX,     ldy, ldz], norm: [0, -1, 0], uv: [1, 1], },  // left back
        ];

        // Create the geometry
        const positions = [];
        const normals = [];
        for ( const vertex of vertices ) {
            positions.push( ...vertex.pos );
            normals.push( ...vertex.norm );
        }
        const positionNumComponents = 3;
        const normalNumComponents = 3;
        // Attributes must have the names 'position', 'normal' (and 'uv' if using textures)
        // Buffer attributes must be given a Float32Array
        this.setAttribute(
            'position',
            new BufferAttribute(new Float32Array(positions), positionNumComponents));
        this.setAttribute(
            'normal',
            new BufferAttribute(new Float32Array(normals), normalNumComponents));
        this.setIndex( [
            0, 1, 2, 2, 1, 3,
            4, 5, 6, 6, 5, 7,
            8, 9, 10, 10, 9, 11,
            12, 13, 14, 14, 13, 15,
            16, 17, 18, 18, 17, 19,
            20, 21, 22, 22, 21, 23,
        ] );
        //this.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );

        function getFaceCoords(transY, transZ, dimensY, dimensZ){
            // Get the coordinates of the side face
            
            // front, bottom corner (from perspective of looking at front of the shape)
            const ay = transY - origY;
            const az = -transZ + origZ;

            // front, top corner
            const by = ay + dimensY;
            const bz = az;
            
            // back, top corner
            const cy = by;
            const cz = az - dimensZ;
        
            // back, bottom corner
            const dy = ay;
            const dz = cz;

            return [ay, az, by, bz, cy, cz, dy, dz];
        }
    } 

    copy( source ) {
		super.copy( source );
		this.parameters = Object.assign( {}, source.parameters );
		return this;
	}
}


export {TrapezoidGeometry};