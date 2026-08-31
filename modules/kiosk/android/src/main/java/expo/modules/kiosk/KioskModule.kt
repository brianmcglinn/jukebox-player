package expo.modules.kiosk

import android.app.Activity
import android.app.ActivityManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class KioskModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("KioskModule")

    Function("startKioskMode") {
      val activity = appContext.currentActivity ?: return@Function
      activity.runOnUiThread { activity.startLockTask() }
    }

    Function("stopKioskMode") {
      val activity = appContext.currentActivity ?: return@Function
      activity.runOnUiThread { activity.stopLockTask() }
    }

    Function("isInKioskMode") {
      val activity = appContext.currentActivity ?: return@Function false
      val am = activity.getSystemService(Activity.ACTIVITY_SERVICE) as ActivityManager
      am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
    }
  }
}
