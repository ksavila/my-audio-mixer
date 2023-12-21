import React, { useState, useEffect, useRef } from 'react';

const AudioMixer = () => {
    const [audioContext, setAudioContext] = useState(null);
    const [tracks, setTracks] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentPosition, setCurrentPosition] = useState(0);
    const [timeAtPause, setTimeAtPause] = useState(0);
    const isAnyTrackSoloed = tracks.some(track => track.isSolo);
    var [startTime, setStartTime] = useState(null);
    var [lastStartTime, setLastStartTime] = useState(null);
    const [pauseTime, setPauseTime] = useState(null);
    const intervalIdRef = useRef(null);




    useEffect(() => {
        const ac = new AudioContext();
        setAudioContext(ac);

        const trackSources = ['/drums.mp3', '/bass.mp3', '/guitar.mp3', '/click.mp3', '/preroll.mp3'];
        const trackNodes = trackSources.map((source, index) => ({
            id: index,
            source,
            buffer: null,
            isMuted: false,
            isSolo: false,
            volume: 1, // Default volume level
            gainNode: ac.createGain()
        }));

        stopPositionInterval();
        setTracks(trackNodes);
        loadTracks(ac, trackNodes);

        return () => {
            clearInterval(intervalIdRef.current);
        };

    }, []);

    // Load tracks into AudioBuffer
    const loadTracks = async (audioContext, tracks) => {
        for (let track of tracks) {
            const response = await fetch(track.source);
            const arrayBuffer = await response.arrayBuffer();
            audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                track.buffer = buffer;
                if (tracks.indexOf(track) === 0) { // Use the duration of the first track
                    setDuration(buffer.duration);
                }
            });
        }
    };



    // Play tracks
    const playTracks = (shouldBePlaying) => {
        if (!startTime) {
            setStartTime(audioContext.currentTime);
        }
        setLastStartTime(audioContext.currentTime);

        tracks.forEach(track => {
            if (track.buffer && !track.audioBufferSourceNode) {
                const source = audioContext.createBufferSource();
                source.buffer = track.buffer;
                source.connect(track.gainNode).connect(audioContext.destination);

                const playOffset = pauseTime || 0;
                source.start(0, playOffset);
                track.audioBufferSourceNode = source;
            }
        });

        if (shouldBePlaying) {
            startPositionInterval(audioContext.currentTime);
        }
    };

    const startPositionInterval = (clockTimeAtPlay) => {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = setInterval(() => {
            if (audioContext) {
                setCurrentPosition(currentPosition + audioContext.currentTime - clockTimeAtPlay);
            }
            if (currentPosition >= duration) {
                stopTracks();
                stopPositionInterval();
            }
        }, 100);
    };

    const stopPositionInterval = () => {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
    };

    const stopTracks = (shouldBePlaying) => {
        tracks.forEach(track => {
            if (track.audioBufferSourceNode) {
                track.audioBufferSourceNode.stop();
                track.audioBufferSourceNode = null;
            }
        });
        setStartTime(0);
        setIsPlaying(false);
        setPauseTime(0); // Store the total elapsed time
        setCurrentPosition(0);

        stopPositionInterval();

    };

    const pauseTracks = (shouldBePlaying) => {
        tracks.forEach(track => {
            if (track.audioBufferSourceNode) {
                track.audioBufferSourceNode.stop();
                track.audioBufferSourceNode = null;
            }
        });


        const elapsed = audioContext.currentTime - startTime;
        setPauseTime(elapsed); // Store the total elapsed time
        setTimeAtPause(lastStartTime + audioContext.currentTime - lastStartTime);
        console.log(audioContext.currentTime);

        if (!shouldBePlaying) {
            stopPositionInterval();
        }
    };


    const handlePlayPause = () => {
        if (!isPlaying) {
            playTracks(true);
            setIsPlaying(true);
        } else {
            pauseTracks(false);
            setIsPlaying(false);
        }
    };



    // Toggle mute for a track
    const toggleMute = (index) => {
        const updatedTracks = [...tracks];
        updatedTracks[index].isMuted = !updatedTracks[index].isMuted;

        // Set gain value based on mute state and volume slider
        updatedTracks[index].gainNode.gain.value = updatedTracks[index].isMuted ? 0 : updatedTracks[index].volume;

        setTracks(updatedTracks);
    };


    // Toggle solo for a track
    const toggleSolo = (index) => {
        const updatedTracks = tracks.map((track, idx) => {
            return {
                ...track,
                isSolo: idx === index ? !track.isSolo : track.isSolo
            };
        });

        applyTrackGains(updatedTracks);
        setTracks(updatedTracks);
    };

    // Apply gain values based on the current mute and solo states
    const applyTrackGains = (tracks) => {
        const isAnyTrackSoloed = tracks.some(track => track.isSolo);

        tracks.forEach(track => {
            if (track.gainNode) {
                if (isAnyTrackSoloed) {
                    // Mute all non-soloed tracks
                    track.gainNode.gain.value = track.isSolo ? track.volume : 0;
                } else {
                    // Apply mute state if no tracks are soloed
                    track.gainNode.gain.value = track.isMuted ? 0 : track.volume;
                }
            }
        });
    };

    const handleVolumeChange = (event, index) => {
        const newVolume = parseFloat(event.target.value);
        const updatedTracks = [...tracks];
        updatedTracks[index].volume = newVolume;

        // Update the gain value only if the track is not muted
        if (!updatedTracks[index].isMuted) {
            updatedTracks[index].gainNode.gain.value = newVolume;
        }

        setTracks(updatedTracks);
    };

    return (
        <div>
            <button onClick={handlePlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
            <button onClick={stopTracks}>Stop</button>
            <div style={{ display: 'flex', justifyContent: 'center', }}>
                {tracks.map((track, index) => (
                    <div key={track.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 'small', border: 'aliceblue', borderStyle: 'solid', opacity: track.isMuted ? 0.5 : 1 }}>
                        {track.source}
                        <div style={{ maxWidth: 45}}>
                            <button onClick={() => toggleMute(index)} disabled={isAnyTrackSoloed}>{track.isMuted ? 'Unmute' : 'Mute'} </button>
                            <button onClick={() => toggleSolo(index)}>{track.isSolo ? 'Unsolo' : 'Solo'}</button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={track.volume}
                                onChange={(e) => handleVolumeChange(e, index)}
                                style={{ writingMode: 'tb' }} // Makes the slider vertical
                            />
                        </div>
                    </div>
                ))}
            </div>
            <div>
                Current Position: {currentPosition.toFixed(0)} / Duration: {duration.toFixed(0)}
                {isPlaying}
            </div>

        </div>

    );
};

export default AudioMixer;
