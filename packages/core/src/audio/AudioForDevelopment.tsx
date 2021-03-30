import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {CompositionManager} from '../CompositionManager';
import {getAssetFileName} from '../get-asset-file-name';
import {getAudioRangeFromStartFromAndDuration} from '../get-audio-visualization-layout';
import {isApproximatelyTheSame} from '../is-approximately-the-same';
import {SequenceContext} from '../sequencing';
import {TimelineContext, usePlayingState} from '../timeline-position-state';
import {useAbsoluteCurrentFrame, useCurrentFrame} from '../use-frame';
import {useUnsafeVideoConfig} from '../use-unsafe-video-config';
import {evaluateVolume} from '../volume-prop';
import {RemotionAudioProps} from './props';

export const AudioForDevelopment: React.FC<RemotionAudioProps> = (props) => {
	const audioRef = useRef<HTMLAudioElement>(null);
	const frame = useCurrentFrame();
	const absoluteFrame = useAbsoluteCurrentFrame();
	const [actualVolume, setActualVolume] = useState(1);

	const videoConfig = useUnsafeVideoConfig();
	const [playing] = usePlayingState();
	const {isThumbnail, rootId} = useContext(TimelineContext);

	const parentSequence = useContext(SequenceContext);
	const actualFrom = parentSequence?.from ?? 0;

	const {registerSequence, unregisterSequence} = useContext(CompositionManager);

	const [id] = useState(() => String(Math.random()));

	const {volume, ...nativeProps} = props;

	useEffect(() => {
		const ref = audioRef.current;
		if (!ref) {
			return;
		}
		if (ref.volume !== actualVolume) {
			setActualVolume(ref.volume);
			return;
		}
		const onChange = () => {
			setActualVolume(ref.volume);
		};
		ref.addEventListener('volumechange', onChange);
		return () => ref.removeEventListener('volumechange', onChange);
	}, [actualVolume]);

	useEffect(() => {
		const userPreferredVolume = evaluateVolume({
			frame,
			volume,
		});
		if (
			!isApproximatelyTheSame(userPreferredVolume, actualVolume) &&
			audioRef.current
		) {
			audioRef.current.volume = userPreferredVolume;
		}
	}, [actualVolume, frame, props.volume, volume]);

	useEffect(() => {
		if (playing) {
			audioRef.current?.play();
		} else {
			audioRef.current?.pause();
		}
	}, [playing]);

	const duration = !videoConfig
		? 0
		: parentSequence
		? Math.min(parentSequence.durationInFrames, videoConfig.durationInFrames)
		: videoConfig.durationInFrames;

	const volumes: string | number = useMemo(() => {
		if (typeof props.volume === 'number') {
			return props.volume;
		}
		const visualizationRange = getAudioRangeFromStartFromAndDuration({
			startFrom: actualFrom,
			durationInFrames: duration,
		});
		return new Array(visualizationRange.durationInFrames)
			.fill(true)
			.map((_, i) => {
				return evaluateVolume({
					frame: i + visualizationRange.startFrom,
					volume,
				});
			})
			.join(',');
	}, [actualFrom, duration, props.volume, volume]);

	useEffect(() => {
		if (!audioRef.current) {
			return;
		}
		if (!videoConfig) {
			return;
		}

		if (!props.src) {
			throw new Error('No src passed');
		}

		registerSequence({
			type: 'audio',
			src: props.src,
			id,
			// TODO: Cap to audio duration
			duration,
			from: actualFrom,
			parent: parentSequence?.id ?? null,
			displayName: getAssetFileName(props.src),
			isThumbnail,
			rootId,
			volume: volumes,
		});
		return () => unregisterSequence(id);
	}, [
		actualFrom,
		duration,
		id,
		isThumbnail,
		parentSequence,
		props.src,
		registerSequence,
		rootId,
		unregisterSequence,
		videoConfig,
		volumes,
	]);

	useEffect(() => {
		if (!audioRef.current) {
			throw new Error('No audio ref found');
		}
		if (!videoConfig) {
			throw new Error(
				'No video config found. <Audio> must be placed inside a composition.'
			);
		}
		const shouldBeTime = frame / videoConfig.fps;

		const isTime = audioRef.current.currentTime;
		const timeShift = Math.abs(shouldBeTime - isTime);
		if (
			timeShift > 0.5 &&
			!audioRef.current.ended &&
			shouldBeTime <= audioRef.current.currentTime
		) {
			console.log('Time has shifted by', timeShift, 'sec. Fixing...');
			// If scrubbing around, adjust timing
			// or if time shift is bigger than 0.2sec
			audioRef.current.currentTime = shouldBeTime;
		}

		if (!playing || absoluteFrame === 0) {
			// If scrubbing around, adjust timing
			// or if time shift is bigger than 0.2sec
			audioRef.current.currentTime = shouldBeTime;
		}
		if (audioRef.current.paused && !audioRef.current.ended && playing) {
			// Play audio
			audioRef.current.play();
		}
	}, [absoluteFrame, frame, playing, videoConfig]);

	return <audio ref={audioRef} {...nativeProps} />;
};
