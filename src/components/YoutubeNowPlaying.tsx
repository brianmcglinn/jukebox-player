import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../lib/colors';
import { NeonBorder } from './NeonBorder';

// react-native-youtube-iframe's own iframe.html constructs its YT.Player
// with a playerVars object that never includes `autoplay` — it relies
// instead on a separate `play` prop bridged over to the WebView after the
// page has already loaded, which is not the same mechanism YouTube's IFrame
// API treats as reliable autoplay, and other users have independently
// reported that bridge not working at all. This builds the player directly
// instead, with autoplay: 1 set at construction time exactly as YouTube's
// own API expects, which is evaluated synchronously as the page loads
// rather than as a later, asynchronous command.
//
// Critically, inline HTML loaded via source={{ html: ... }} has no real
// document origin unless a baseUrl is set — and the YouTube IFrame API does
// genuine origin validation server-side. Without a matching origin/baseUrl
// pair, the player can fail to initialize entirely (silent black screen,
// no error event) rather than just being blocked from autoplaying. The
// origin below must exactly match the WebView's baseUrl further down.
function buildPlayerHtml(videoId: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<style>
  html, body { margin: 0; padding: 0; background: #000; overflow: hidden; height: 100%; }
  #player { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="player"></div>
<script>
  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  var player;

  function post(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }

  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      width: '100%',
      height: '100%',
      videoId: '${videoId}',
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        controls: 0,
        rel: 0,
        cc_load_policy: 0,
        origin: 'https://localhost'
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });
  }

  function onPlayerReady(event) {
    setInterval(function () {
      try {
        post({
          type: 'progress',
          position: player.getCurrentTime(),
          duration: player.getDuration()
        });
      } catch (e) {}
    }, 500);
  }

  function onPlayerStateChange(event) {
    post({ type: 'stateChange', data: event.data });
  }

  function onPlayerError(event) {
    post({ type: 'error', data: event.data });
  }
</script>
</body>
</html>`;
}

// YouTube IFrame API numeric player states.
const YT_ENDED = 0;

const FRAME_MARGIN = 10;
const BORDER_WIDTH = 4;

export function YoutubeNowPlaying({
  videoId,
  onEnded,
  onError,
  onProgress,
}: {
  videoId: string;
  onEnded: () => void;
  onError: () => void;
  onProgress?: (position: number, duration: number) => void;
}) {
  const webViewRef = useRef<WebView>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    return () => {
      // Explicitly stop and tear down the player before the WebView itself
      // gets torn down by React unmounting it. A bare unmount doesn't give
      // Chromium's media engine a clean chance to release Android's audio
      // focus, which was leaving Plex's subsequent track silent even though
      // it loaded and reported progress normally — the focus was apparently
      // still held by the just-finished YouTube video's audio session.
      webViewRef.current?.injectJavaScript(
        'try { if (window.player) { player.stopVideo(); player.destroy(); } } catch (e) {} true;'
      );
    };
  }, []);

  const frameWidth = Math.max(containerSize.width - FRAME_MARGIN * 2, 0);
  const frameHeight = Math.max(containerSize.height - FRAME_MARGIN * 2, 0);
  const webViewWidth = Math.max(frameWidth - BORDER_WIDTH * 2, 0);
  const webViewHeight = Math.max(frameHeight - BORDER_WIDTH * 2, 0);

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}
      onLayout={(e) =>
        setContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
    >
      {frameWidth > 0 && frameHeight > 0 && (
        <NeonBorder width={frameWidth} height={frameHeight} borderWidth={BORDER_WIDTH}>
          <WebView
            ref={webViewRef}
            source={{ html: buildPlayerHtml(videoId), baseUrl: 'https://localhost/' }}
            style={{ width: webViewWidth, height: webViewHeight, backgroundColor: '#000' }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            onMessage={(event) => {
              try {
                const msg = JSON.parse(event.nativeEvent.data);
                if (msg.type === 'stateChange') {
                  if (msg.data === YT_ENDED) onEnded();
                } else if (msg.type === 'progress') {
                  onProgress?.(msg.position ?? 0, msg.duration ?? 0);
                } else if (msg.type === 'error') {
                  onError();
                }
              } catch {
                // ignore malformed/unexpected messages
              }
            }}
          />
        </NeonBorder>
      )}
    </View>
  );
}
