"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

// We import dynamically to avoid SSR issues with the Epic library.
// We use 'any' to bypass strict type checks for the library internals 
// as we cannot easily verify the exact exports in this environment.

export interface PixelStreamingPlayerRef {
    emitUIInteraction: (data: object) => void;
}

const PixelStreamingPlayer = forwardRef<PixelStreamingPlayerRef, {}>((props, ref) => {
    const videoParentRef = useRef<HTMLDivElement>(null);
    const [psInstance, setPsInstance] = useState<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useImperativeHandle(ref, () => ({
        emitUIInteraction: (data: object) => {
            if (psInstance) {
                console.log("Sending data to UE:", data);
                // Depending on the library version, emitUIInteraction might be on the stream or application
                // We try safe access
                if (typeof psInstance.emitUIInteraction === 'function') {
                    psInstance.emitUIInteraction(data);
                } else if (psInstance.stream && typeof psInstance.stream.emitUIInteraction === 'function') {
                    psInstance.stream.emitUIInteraction(data);
                } else {
                    console.warn("emitUIInteraction method not found on PS instance");
                }
            } else {
                console.warn("Pixel Streaming instance not ready");
            }
        }
    }));

    useEffect(() => {
        const loadLib = async () => {
            if (typeof window === 'undefined') return;
            if (isLoaded) return;

            try {
                // Import as any
                const PS: any = await import('@epicgames-ps/lib-pixelstreamingfrontend-ui-ue5.4');

                console.log("PS library exports:", Object.keys(PS));

                // Try to find a working config constructor
                let config: any = null;
                const configOptions = {
                    initialSettings: {
                        AutoPlayVideo: true,
                        AutoConnect: true,
                        StartVideoMuted: true,
                        HoveringMouse: true,
                        WaitForStreamer: true,
                    }
                };

                // Try different config classes
                const ConfigClass = PS.Config || PS.ConfigUI || PS.default?.Config;
                if (ConfigClass && typeof ConfigClass === 'function') {
                    try {
                        config = new ConfigClass(configOptions);
                    } catch (configErr) {
                        console.warn('Config constructor failed, trying without options:', configErr);
                        try {
                            config = new ConfigClass();
                        } catch (e2) {
                            console.warn('Config creation failed entirely:', e2);
                        }
                    }
                }

                if (!config) {
                    console.warn('Pixel Streaming: No valid config, skipping. Unreal Engine may not be running.');
                    return;
                }

                // Create stream
                const StreamClass = PS.PixelStreaming || PS.default?.PixelStreaming;
                if (!StreamClass) {
                    console.warn('PixelStreaming class not found');
                    return;
                }

                const stream = new StreamClass(config);

                // Application wrapper
                const AppClass = PS.Application || PS.default?.Application;
                if (AppClass) {
                    const application = new AppClass({
                        stream: stream,
                        onColorModeChanged: () => { },
                        settingsPanelConfig: { visibility: false }
                    } as any);

                    if (videoParentRef.current) {
                        videoParentRef.current.appendChild(application.rootElement);
                    }
                }

                setPsInstance(stream);
                setIsLoaded(true);

            } catch (error) {
                console.warn("Pixel Streaming not available (Unreal Engine may not be running):", error);
            }
        };

        loadLib();

        return () => {
            // Cleanup if needed
        }
    }, []);

    return (
        <div
            ref={videoParentRef}
            className="pixel-streaming-container"
            style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
        />
    );
});

PixelStreamingPlayer.displayName = "PixelStreamingPlayer";

export default PixelStreamingPlayer;
