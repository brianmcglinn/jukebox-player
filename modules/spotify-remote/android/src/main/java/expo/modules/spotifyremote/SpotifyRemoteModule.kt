package expo.modules.spotifyremote

import com.spotify.android.appremote.api.ConnectionParams
import com.spotify.android.appremote.api.Connector
import com.spotify.android.appremote.api.SpotifyAppRemote
import com.spotify.protocol.client.Subscription
import com.spotify.protocol.types.PlayerState
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Thin wrapper around Spotify's official Android App Remote SDK — the whole
// point of this module is to talk to the SDK directly, with nothing else in
// between. Authorization happens natively, inside the Spotify app itself
// (a one-time "Allow this app to control Spotify?" prompt shown by Spotify,
// not a browser and not a custom redirect scheme our own app has to catch),
// which is what a browser-based OAuth flow could never do cleanly under
// screen pinning or alongside Expo Router's own deep-link handling.
class SpotifyRemoteModule : Module() {
  private var appRemote: SpotifyAppRemote? = null
  private var stateSubscription: Subscription<PlayerState>? = null

  override fun definition() = ModuleDefinition {
    Name("SpotifyRemote")

    Events("onConnected", "onDisconnected", "onError", "onPlayerStateChanged")

    AsyncFunction("connect") { clientId: String, redirectUri: String, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "No current activity to connect from", null)
        return@AsyncFunction
      }

      val connectionParams = ConnectionParams.Builder(clientId)
        .setRedirectUri(redirectUri)
        // true = Spotify's own app shows its native authorization prompt
        // the first time this app requests access; subsequent connects in
        // later sessions are silent once already authorized.
        .showAuthView(true)
        .build()

      SpotifyAppRemote.connect(
        activity.applicationContext,
        connectionParams,
        object : Connector.ConnectionListener {
          override fun onConnected(spotifyAppRemote: SpotifyAppRemote) {
            appRemote = spotifyAppRemote
            subscribeToPlayerState()
            sendEvent("onConnected", mapOf<String, Any?>())
            promise.resolve(true)
          }

          override fun onFailure(throwable: Throwable) {
            sendEvent("onError", mapOf("message" to (throwable.message ?: "Connection failed")))
            promise.reject("CONNECTION_FAILED", throwable.message ?: "Connection failed", throwable)
          }
        }
      )
    }

    Function("disconnect") {
      stateSubscription?.cancel()
      stateSubscription = null
      appRemote?.let { SpotifyAppRemote.disconnect(it) }
      appRemote = null
      sendEvent("onDisconnected", mapOf<String, Any?>())
    }

    Function("isConnected") {
      appRemote?.isConnected ?: false
    }

    AsyncFunction("play") { uri: String, promise: Promise ->
      val remote = appRemote
      if (remote == null) {
        promise.reject("NOT_CONNECTED", "Not connected to Spotify", null)
        return@AsyncFunction
      }
      remote.playerApi.play(uri)
        .setResultCallback { promise.resolve(true) }
        .setErrorCallback { error -> promise.reject("PLAY_FAILED", error.message ?: "play() failed", error) }
    }

    AsyncFunction("pause") { promise: Promise ->
      val remote = appRemote
      if (remote == null) {
        promise.reject("NOT_CONNECTED", "Not connected to Spotify", null)
        return@AsyncFunction
      }
      remote.playerApi.pause()
        .setResultCallback { promise.resolve(true) }
        .setErrorCallback { error -> promise.reject("PAUSE_FAILED", error.message ?: "pause() failed", error) }
    }

    AsyncFunction("resume") { promise: Promise ->
      val remote = appRemote
      if (remote == null) {
        promise.reject("NOT_CONNECTED", "Not connected to Spotify", null)
        return@AsyncFunction
      }
      remote.playerApi.resume()
        .setResultCallback { promise.resolve(true) }
        .setErrorCallback { error -> promise.reject("RESUME_FAILED", error.message ?: "resume() failed", error) }
    }

    AsyncFunction("skipNext") { promise: Promise ->
      val remote = appRemote
      if (remote == null) {
        promise.reject("NOT_CONNECTED", "Not connected to Spotify", null)
        return@AsyncFunction
      }
      remote.playerApi.skipNext()
        .setResultCallback { promise.resolve(true) }
        .setErrorCallback { error -> promise.reject("SKIP_FAILED", error.message ?: "skipNext() failed", error) }
    }

    AsyncFunction("getPlayerState") { promise: Promise ->
      val remote = appRemote
      if (remote == null) {
        promise.reject("NOT_CONNECTED", "Not connected to Spotify", null)
        return@AsyncFunction
      }
      remote.playerApi.playerState
        .setResultCallback { state -> promise.resolve(playerStateToMap(state)) }
        .setErrorCallback { error -> promise.reject("STATE_FAILED", error.message ?: "getPlayerState() failed", error) }
    }
  }

  private fun subscribeToPlayerState() {
  val subscription = appRemote?.playerApi?.subscribeToPlayerState() ?: return
  subscription.setEventCallback { state -> sendEvent("onPlayerStateChanged", playerStateToMap(state)) }
  subscription.setErrorCallback { error ->
    sendEvent("onError", mapOf("message" to (error.message ?: "Player state subscription failed")))
  }
  stateSubscription = subscription
}

  // NOTE: imageUri here is Spotify's own internal image identifier, not a
  // directly-loadable http(s) URL — resolving it into real artwork requires
  // a separate call through the SDK's ImagesApi. Left as a raw string for
  // now; wiring up actual artwork display is a follow-up once basic
  // playback is confirmed working end to end.
  private fun playerStateToMap(state: PlayerState): Map<String, Any?> {
    return mapOf(
      "trackUri" to state.track?.uri,
      "trackName" to state.track?.name,
      "artistName" to state.track?.artist?.name,
      "albumName" to state.track?.album?.name,
      "imageUri" to state.track?.imageUri?.raw,
      "durationMs" to state.track?.duration,
      "isPaused" to state.isPaused,
      "playbackPositionMs" to state.playbackPosition,
      "playbackSpeed" to state.playbackSpeed
    )
  }
}
