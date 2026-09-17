import { requireNativeModule, EventEmitter, Subscription } from 'expo-modules-core';

const SpotifyRemote = requireNativeModule('SpotifyRemote');
const emitter = new EventEmitter(SpotifyRemote);

export interface SpotifyPlayerState {
  trackUri: string | null;
  trackName: string | null;
  artistName: string | null;
  albumName: string | null;
  // Spotify's own internal image identifier, not a directly-loadable URL.
  // Resolving real artwork is a follow-up (see SpotifyRemoteModule.kt).
  imageUri: string | null;
  durationMs: number | null;
  isPaused: boolean;
  playbackPositionMs: number;
  playbackSpeed: number;
}

// clientId/redirectUri match what's already registered in the Spotify
// Developer Dashboard — the same values used throughout this project, no
// new Dashboard registration needed for this module specifically.
export async function connect(clientId: string, redirectUri: string): Promise<boolean> {
  return SpotifyRemote.connect(clientId, redirectUri);
}

export function disconnect(): void {
  SpotifyRemote.disconnect();
}

export function isConnected(): boolean {
  return SpotifyRemote.isConnected();
}

export async function play(uri: string): Promise<boolean> {
  return SpotifyRemote.play(uri);
}

export async function pause(): Promise<boolean> {
  return SpotifyRemote.pause();
}

export async function resume(): Promise<boolean> {
  return SpotifyRemote.resume();
}

export async function skipNext(): Promise<boolean> {
  return SpotifyRemote.skipNext();
}

export async function getPlayerState(): Promise<SpotifyPlayerState> {
  return SpotifyRemote.getPlayerState();
}

export function addPlayerStateListener(listener: (state: SpotifyPlayerState) => void): Subscription {
  return emitter.addListener('onPlayerStateChanged', listener);
}

export function addConnectionListener(listener: () => void): Subscription {
  return emitter.addListener('onConnected', listener);
}

export function addDisconnectionListener(listener: () => void): Subscription {
  return emitter.addListener('onDisconnected', listener);
}

export function addErrorListener(listener: (error: { message: string }) => void): Subscription {
  return emitter.addListener('onError', listener);
}
