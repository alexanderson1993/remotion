import React, {useState} from 'react';
import {Audio, continueRender, delayRender, Img, staticFile} from 'remotion';

export const StaticDemo: React.FC = () => {
	const [handle1] = useState(() => delayRender());
	const [handle2] = useState(() => delayRender());
	const [handle3] = useState(() => delayRender('rendering of audio'));
	return (
		<>
			<Img
				src={staticFile('logo.png')}
				onLoad={() => continueRender(handle1)}
			/>
			<Img
				src={staticFile('/nested/mp4.png')}
				onLoad={() => continueRender(handle2)}
			/>
			<Audio
				src={staticFile('/framer.mp4')}
				onLoad={() => continueRender(handle3)}
			/>
		</>
	);
};
