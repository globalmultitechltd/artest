import { parseGIF, decompressFrames } from 'https://esm.sh/gifuct-js@2.1.2';

function buildFrameCanvases( gif, frames ) {

	const width = gif.lsd.width;
	const height = gif.lsd.height;
	const canvas = document.createElement( 'canvas' );
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext( '2d', { willReadFrequently: true } );
	const imageData = ctx.createImageData( width, height );
	const built = [];

	for ( let i = 0; i < frames.length; i ++ ) {

		const frame = frames[ i ];
		const dims = frame.dims;
		const patch = frame.patch;

		for ( let y = 0; y < dims.height; y ++ ) {

			for ( let x = 0; x < dims.width; x ++ ) {

				const patchIndex = ( y * dims.width + x ) * 4;
				const canvasIndex = ( ( dims.top + y ) * width + ( dims.left + x ) ) * 4;
				const alpha = patch[ patchIndex + 3 ];

				if ( alpha === 0 ) continue;

				imageData.data[ canvasIndex ] = patch[ patchIndex ];
				imageData.data[ canvasIndex + 1 ] = patch[ patchIndex + 1 ];
				imageData.data[ canvasIndex + 2 ] = patch[ patchIndex + 2 ];
				imageData.data[ canvasIndex + 3 ] = alpha;

			}

		}

		ctx.putImageData( imageData, 0, 0 );

		const frameCanvas = document.createElement( 'canvas' );
		frameCanvas.width = width;
		frameCanvas.height = height;
		frameCanvas.getContext( '2d' ).drawImage( canvas, 0, 0 );

		const delayCs = frame.delay > 0 ? frame.delay : 10;
		built.push( {
			canvas: frameCanvas,
			delay: delayCs * 0.01
		} );

		if ( frame.disposalType === 2 ) {

			for ( let y = 0; y < dims.height; y ++ ) {

				for ( let x = 0; x < dims.width; x ++ ) {

					const canvasIndex = ( ( dims.top + y ) * width + ( dims.left + x ) ) * 4;
					imageData.data[ canvasIndex ] = 0;
					imageData.data[ canvasIndex + 1 ] = 0;
					imageData.data[ canvasIndex + 2 ] = 0;
					imageData.data[ canvasIndex + 3 ] = 0;

				}

			}

		}

	}

	return built;

}

/**
 * Loads an animated GIF and returns a THREE.CanvasTexture plus update/dispose hooks.
 */
export async function createBatGifTexture( THREE, url = 'textures/bat.gif' ) {

	const response = await fetch( url );

	if ( ! response.ok ) {

		throw new Error( 'Failed to load bat GIF: ' + url );

	}

	const buffer = await response.arrayBuffer();
	const gif = parseGIF( buffer );
	const frames = decompressFrames( gif, true );

	if ( frames.length === 0 ) {

		throw new Error( 'Bat GIF has no frames: ' + url );

	}

	const builtFrames = buildFrameCanvases( gif, frames );
	const width = gif.lsd.width;
	const height = gif.lsd.height;
	const displayCanvas = document.createElement( 'canvas' );
	displayCanvas.width = width;
	displayCanvas.height = height;
	const displayCtx = displayCanvas.getContext( '2d' );

	displayCtx.drawImage( builtFrames[ 0 ].canvas, 0, 0 );

	const texture = new THREE.CanvasTexture( displayCanvas );
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;

	let frameIndex = 0;
	let frameTime = 0;

	// GIF frame delays are often long; ~3× feels lively without looking frantic.
	const PLAYBACK_SPEED = 30;

	function update( delta ) {

		if ( builtFrames.length <= 1 ) return;

		frameTime += delta * PLAYBACK_SPEED;

		let advanced = false;

		let delay = builtFrames[ frameIndex ].delay > 0 ? builtFrames[ frameIndex ].delay : 0.1;

		while ( frameTime >= delay ) {

			frameTime -= delay;
			frameIndex = ( frameIndex + 1 ) % builtFrames.length;
			delay = builtFrames[ frameIndex ].delay > 0 ? builtFrames[ frameIndex ].delay : 0.1;
			advanced = true;

		}

		if ( ! advanced ) return;

		displayCtx.clearRect( 0, 0, width, height );
		displayCtx.drawImage( builtFrames[ frameIndex ].canvas, 0, 0 );
		texture.needsUpdate = true;

	}

	function dispose() {

		texture.dispose();

	}

	return {
		texture,
		width,
		height,
		update,
		dispose
	};

}
