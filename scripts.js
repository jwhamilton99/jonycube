/*
//x drag
// xAcc += xDelta * (
// 	(
// 		Math.sin(yTotal * (Math.PI/180)) *
// 		Math.sin(zTotal * (Math.PI/180))
// 	)
// )
// yAcc += xDelta * (
// 	(
// 		Math.cos(xTotal * (Math.PI/180)) *
// 		Math.cos(zTotal * (Math.PI/180))
// 	)
// )
// 
// zAcc += xDelta * (
// 	(
// 		Math.sin(xTotal * (Math.PI/180)) *
// 		Math.cos(yTotal * (Math.PI/180))
// 	)
// )

//y drag
xAcc += yDelta * (
	(
		Math.cos(yTotal * (Math.PI/180)) *
		Math.cos(zTotal * (Math.PI/180))
	)
);

yAcc += yDelta * (
	(
		Math.cos(xTotal * (Math.PI/180)) *
		Math.sin(zTotal * (Math.PI/180))
	)
)
zAcc += -yDelta * (
	(
		Math.cos(xTotal * (Math.PI/180)) *
		Math.sin(yTotal * (Math.PI/180))
	)
)
*/

window.onload = main;

var cubeRotation = 0.0;

var friction = 0.85;

var xRot = 0;
var yRot = 0;
var zRot = 0;

var xAcc = 0;
var yAcc = 318;
var zAcc = 0;

var dampener = 0.2;

function resize() {
	const canvas = document.querySelector("#glCanvas");
	const minDim = Math.max(Math.min(window.innerWidth, window.innerHeight), 750);
	
	canvas.width = minDim;
	canvas.height = minDim;
	canvas.style.width = minDim;
	canvas.style.height = minDim;
}

function initWebGL() {
	const canvas = document.querySelector("#glCanvas");

	const gl = canvas.getContext("webgl");
	
	if(gl == null) {
		alert("unable to init webgl");
		return;
	}
	
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	const vsSource = `
		attribute vec4 aVertexPosition;
		attribute vec3 aVertexNormal;
		attribute vec2 aTextureCoord;
		
		uniform mat4 uModelViewMatrix;
		uniform mat4 uProjectionMatrix;
		uniform mat4 uNormalMatrix;
		
		varying highp vec2 vTextureCoord;
		varying highp vec3 vLighting;
		
		void main() {
			gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
			vTextureCoord = aTextureCoord;
			
			highp vec3 ambientLight = vec3(0.5, 0.5, 0.5);
			highp vec3 directionalLightColor = vec3(1, 1, 1);
			highp vec3 directionalVector = normalize(vec3(0.0, 0.5, 0.5));
			
			highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
			
			highp float directional = min(max(dot(transformedNormal.xyz, directionalVector), 0.0), 0.5);
			
			vLighting = ambientLight + (directionalLightColor * directional);
		}
	`;
	
	const fsSource = `
		varying highp vec2 vTextureCoord;
		varying highp vec3 vLighting;
		
		uniform sampler2D uSampler;
		
		void main() {
			highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
			gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
		}
	`;
	
	const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
	
	const programInfo = {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
			textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
			vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
			uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
			normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
		},
	};
	
	const buffers = initBuffers(gl);
	
	const texture = loadTexture(gl, 'jonytexture.png');
	
	var then = 0;
	
	function render(now) {
		now *= 0.001;
		const deltaTime = now-then;
		then = now;
		
		xAcc*=friction;
		yAcc*=friction;
		zAcc*=friction;
		
		if(dragging) {
			yAcc += -xDelta;
			xAcc += -yDelta;
		}
		
		xRot += xAcc*dampener;
		yRot += yAcc*dampener;
		// zRot += zAcc*dampener;
		
		drawScene(gl, programInfo, buffers, deltaTime, texture);
		
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
}

function main() {
	const canvas = document.querySelector("#glCanvas");
	window.onresize = resize;
	
	resize();
	
	canvas.addEventListener("mousedown", handleMouseDown);
	canvas.addEventListener("mouseup", handleMouseUp);
	canvas.addEventListener("mousemove", handleMouseDrag);
	canvas.addEventListener("mouseout", handleMouseExit);
	
	canvas.addEventListener("touchmove", handleMouseDrag);
	canvas.addEventListener("touchend", handleMouseUp);
	canvas.addEventListener("touchstart", handleMouseDown);
	canvas.addEventListener("touchcancel", handleMouseExit);
	
	initWebGL();
}

function initShaderProgram(gl, vsSource, fsSource) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
	
	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	
	if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("unable to initialize shader");
		return null;
	}
	
	return shaderProgram;
}

function loadShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert("could not compile shader"+ gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	
	return shader;
}

function initBuffers(gl) {
	const positions = [
		  // Front face
		  -1.0, -1.0,  1.0,
		   1.0, -1.0,  1.0,
		   1.0,  1.0,  1.0,
		  -1.0,  1.0,  1.0,
		
		  // Back face
		  -1.0, -1.0, -1.0,
		  -1.0,  1.0, -1.0,
		   1.0,  1.0, -1.0,
		   1.0, -1.0, -1.0,
		
		  // Top face
		  -1.0,  1.0, -1.0,
		  -1.0,  1.0,  1.0,
		   1.0,  1.0,  1.0,
		   1.0,  1.0, -1.0,
		
		  // Bottom face
		  -1.0, -1.0, -1.0,
		   1.0, -1.0, -1.0,
		   1.0, -1.0,  1.0,
		  -1.0, -1.0,  1.0,
		
		  // Right face
		   1.0, -1.0, -1.0,
		   1.0,  1.0, -1.0,
		   1.0,  1.0,  1.0,
		   1.0, -1.0,  1.0,
		
		  // Left face
		  -1.0, -1.0, -1.0,
		  -1.0, -1.0,  1.0,
		  -1.0,  1.0,  1.0,
		  -1.0,  1.0, -1.0,
	];
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
	
	const textureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
	
	const textureCoordinates = [
		// Front
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		// Back
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		0.0,  0.0,
		// Top
		1.0,  1.0,
		1.0,  0.0,
		0.0,  0.0,
		0.0,  1.0,
		// Bottom
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		// Right
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		0.0,  0.0,
		// Left
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
	];
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
	
	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	
	const indices = [
		0,  1,  2,      0,  2,  3,    // front
		4,  6,  7,		4,  5,  6,    // back
		8,  9,  10,     8,  10, 11,   // top
		12, 13, 14,     12, 14, 15,   // bottom
		16, 17, 18,     16, 18, 19,   // right
		20, 21, 22,     20, 22, 23,   // left
	];
	
	gl.bufferData(
		gl.ELEMENT_ARRAY_BUFFER,
		new Uint16Array(indices),
		gl.STATIC_DRAW
	);
	
	const vertexNormals = [
		// Front
		0.0,  0.0,  1.0,
		0.0,  0.0,  1.0,
		0.0,  0.0,  1.0,
		0.0,  0.0,  1.0,
		
		// Back
		0.0,  0.0, -1.0,
		0.0,  0.0, -1.0,
		0.0,  0.0, -1.0,
		0.0,  0.0, -1.0,
		
		// Top
		0.0,  1.0,  0.0,
		0.0,  1.0,  0.0,
		0.0,  1.0,  0.0,
		0.0,  1.0,  0.0,
		
		// Bottom
		0.0, -1.0,  0.0,
		0.0, -1.0,  0.0,
		0.0, -1.0,  0.0,
		0.0, -1.0,  0.0,
		
		// Right
		1.0,  0.0,  0.0,
		1.0,  0.0,  0.0,
		1.0,  0.0,  0.0,
		1.0,  0.0,  0.0,
		
		// Left
		-1.0,  0.0,  0.0,
		-1.0,  0.0,  0.0,
		-1.0,  0.0,  0.0,
		-1.0,  0.0,  0.0
	];
	const normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);
	
	return {
		position: positionBuffer,
		textureCoord: textureCoordBuffer,
		indices: indexBuffer,
		normal: normalBuffer,
	};
}

function drawScene(gl, programInfo, buffers, deltaTime, texture) {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	const fieldOfView = 45 * Math.PI / 180;
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 100.0;
	const projectionMatrix = mat4.create();
	
	mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
	
	const modelViewMatrix = mat4.create();
	
	mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);
	mat4.rotate(modelViewMatrix, modelViewMatrix, Math.PI, [0, 0, 1]);
	
	var rotMatrixX = mat4.create();
	var rotMatrixY = mat4.create();
	var rotMatrix = mat4.create();
	
	mat4.fromYRotation(rotMatrixY, yRot*(Math.PI/180));
	mat4.fromXRotation(rotMatrixX, xRot*(Math.PI/180));
	mat4.multiply(rotMatrix, rotMatrixX, rotMatrixY);
	
	mat4.multiply(modelViewMatrix, modelViewMatrix, rotMatrix);
		
	const normalMatrix = mat4.create();
	mat4.invert(normalMatrix, modelViewMatrix);
	mat4.transpose(normalMatrix, normalMatrix)
	
	{
		const numComponents = 3;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
		gl.vertexAttribPointer(
			programInfo.attribLocations.vertexPosition,
			numComponents,
			type,
			normalize,
			stride,
			offset
		);
		gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
	}
	
	{
		const numComponents = 2;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
		gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, numComponents, type, normalize, stride, offset);
		gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
	}
	
	{
		const numComponents = 3;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
		gl.vertexAttribPointer(
			programInfo.attribLocations.vertexNormal,
			numComponents,
			type,
			normalize,
			stride,
			offset
		);
		gl.enableVertexAttribArray(
			programInfo.attribLocations.vertexNormal
		);
	}
	
	{
		const vertexCount = 36;
		const type = gl.UNSIGNED_SHORT;
		const offset = 0;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
		gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
	}
	
	gl.useProgram(programInfo.program);
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.normalMatrix,
		false,
		normalMatrix
	);
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.projectionMatrix,
		false,
		projectionMatrix
	);
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.modelViewMatrix,
		false,
		modelViewMatrix
	);
	
	{
		const offset = 0;
		const vertexCount = 4;
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
		
		gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
	}
	
	// cubeRotation+=deltaTime;
}

function loadTexture(gl, url) {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	
	const level = 0;
	const internalFormat = gl.RGBA;
	const width = 1;
	const height = 1;
	const border = 0;
	const srcFormat = gl.RGBA;
	const srcType = gl.UNSIGNED_BYTE;
	const pixel = new Uint8Array([0, 0, 255, 255]);
	
	gl.texImage2D(
		gl.TEXTURE_2D,
		level,
		internalFormat,
		width,
		height,
		border,
		srcFormat,
		srcType,
		pixel
	);
	
	const image = new Image();
	image.onload = function() {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			level, 
			internalFormat, 
			srcFormat, 
			srcType, 
			image
		);
		
		if(isPowerOf2(image.width) && isPowerOf2(image.height)) {
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
	};
	image.src = url;
	return texture;
}

function isPowerOf2(value) {
	return (value & (value-1)) == 0;
}

var dragging = false;
var lastX = 0;
var lastY = 0;

var xDelta = 0;
var yDelta = 0;

var xDrag = 0;
var yDrag = 0;

function handleMouseDown(e) {
	dragging = true;
	xDelta = 0;
	yDelta = 0;
}

function handleMouseUp(e) {
	dragging = false;
}

function handleMouseExit(e) {
	dragging = false;
}

function handleMouseDrag(e) {
	if(e.touches != undefined) {
		xDelta = e.touches[0].clientX-lastX;
		yDelta = e.touches[0].clientY-lastY;
		lastX = e.touches[0].clientX;
		lastY = e.touches[0].clientY;
	} else {
		xDelta = e.clientX-lastX;
		yDelta = e.clientY-lastY;
		lastX = e.clientX;
		lastY = e.clientY;
	}
}