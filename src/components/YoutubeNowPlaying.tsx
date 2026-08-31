import YoutubePlayer from 'react-native-youtube-iframe';

export function YoutubeNowPlaying({
  videoId,
  onEnded,
  onError,
}: {
  videoId: string;
  onEnded: () => void;
  onError: () => void;
}) {
  return (
    <YoutubePlayer
      height={400}
      play
      videoId={videoId}
      onChangeState={(state) => {
        if (state === 'ended') onEnded();
      }}
      onError={onError}
    />
  );
}
