package com.waymark.lifeos

import android.content.Context
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = SignalAlarmModule.NAME)
class SignalAlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  @ReactMethod
  fun getAlarmHealth(promise: Promise) {
    try {
      val result = Arguments.createMap().apply {
        putInt("sdkInt", Build.VERSION.SDK_INT)
        putBoolean("notificationPermissionGranted", SignalAlarmSupport.notificationPermissionGranted(reactApplicationContext))
        putBoolean("exactAlarmPermissionGranted", SignalAlarmSupport.canScheduleExactAlarms(reactApplicationContext))
        putBoolean("fullScreenIntentPermissionGranted", SignalAlarmSupport.canUseFullScreenIntent(reactApplicationContext))
        putBoolean("batteryOptimizationIgnored", SignalAlarmSupport.ignoringBatteryOptimizations(reactApplicationContext))
        putBoolean(
          "canShowFullScreenAlarm",
          SignalAlarmSupport.notificationPermissionGranted(reactApplicationContext) &&
            SignalAlarmSupport.canScheduleExactAlarms(reactApplicationContext) &&
            SignalAlarmSupport.canUseFullScreenIntent(reactApplicationContext),
        )
        putString("lastAlarmId", reactApplicationContext.getSharedPreferences(SignalAlarmSupport.PREFS_NAME, Context.MODE_PRIVATE).getString(SignalAlarmSupport.PREF_LAST_ALARM_ID, null))
        putString("lastAction", reactApplicationContext.getSharedPreferences(SignalAlarmSupport.PREFS_NAME, Context.MODE_PRIVATE).getString(SignalAlarmSupport.PREF_LAST_ACTION, null))
        putDouble("lastScheduledAt", SignalAlarmSupport.currentScheduledAt(reactApplicationContext).toDouble())
        putString("lastTitle", SignalAlarmSupport.currentTitle(reactApplicationContext))
        putString("lastBody", SignalAlarmSupport.currentBody(reactApplicationContext))
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("ERR_SIGNAL_ALARM_HEALTH", error)
    }
  }

  @ReactMethod
  fun scheduleAlarm(alarmId: String, triggerAtMillis: Double, title: String, body: String, presentation: ReadableMap?, promise: Promise) {
    try {
      val fireAt = triggerAtMillis.toLong()
      SignalAlarmSupport.scheduleExactAlarm(
        reactApplicationContext,
        alarmId,
        title,
        body,
        presentation = presentation?.toAlarmPresentationPayload(),
        fireAt,
      )
      val result = Arguments.createMap().apply {
        putString("alarmId", alarmId)
        putDouble("fireAt", fireAt.toDouble())
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("ERR_SIGNAL_ALARM_SCHEDULE", error)
    }
  }

  @ReactMethod
  fun cancelAlarm(alarmId: String, promise: Promise) {
    try {
      SignalAlarmSupport.cancelAlarm(reactApplicationContext, alarmId)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("ERR_SIGNAL_ALARM_CANCEL", error)
    }
  }

  @ReactMethod
  fun scheduleTestAlarm(delayMs: Double, title: String, body: String, presentation: ReadableMap?, promise: Promise) {
    try {
      val fireAt = System.currentTimeMillis() + delayMs.toLong()
      SignalAlarmSupport.scheduleExactAlarm(
        reactApplicationContext,
        SignalAlarmSupport.TEST_ALARM_ID,
        title,
        body,
        presentation = presentation?.toAlarmPresentationPayload(),
        fireAt,
      )
      val result = Arguments.createMap().apply {
        putString("alarmId", SignalAlarmSupport.TEST_ALARM_ID)
        putDouble("fireAt", fireAt.toDouble())
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("ERR_SIGNAL_ALARM_SCHEDULE", error)
    }
  }

  @ReactMethod
  fun cancelTestAlarm(promise: Promise) {
    try {
      SignalAlarmSupport.cancelAlarm(reactApplicationContext, SignalAlarmSupport.TEST_ALARM_ID)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("ERR_SIGNAL_ALARM_CANCEL", error)
    }
  }

  @ReactMethod
  fun openNotificationSettings(promise: Promise) {
    try {
      SignalAlarmSupport.openNotificationSettings(reactApplicationContext)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("ERR_SIGNAL_ALARM_OPEN_NOTIFICATION_SETTINGS", error)
    }
  }

  @ReactMethod
  fun openExactAlarmSettings(promise: Promise) {
    try {
      SignalAlarmSupport.openExactAlarmSettings(reactApplicationContext)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("ERR_SIGNAL_ALARM_OPEN_EXACT_SETTINGS", error)
    }
  }

  @ReactMethod
  fun openFullScreenIntentSettings(promise: Promise) {
    try {
      SignalAlarmSupport.openFullScreenIntentSettings(reactApplicationContext)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("ERR_SIGNAL_ALARM_OPEN_FULLSCREEN_SETTINGS", error)
    }
  }

  companion object {
    const val NAME = "WaymarkSignalAlarm"
  }
}

private fun ReadableMap.toAlarmPresentationPayload(): AlarmPresentationPayload {
  fun optionalString(key: String): String? {
    return if (hasKey(key) && !isNull(key)) getString(key) else null
  }

  return AlarmPresentationPayload(
    signalTitle = optionalString("signalTitle"),
    targetTitle = optionalString("targetTitle"),
    targetKind = optionalString("targetKind"),
    targetIconName = optionalString("targetIconName"),
    bellIconName = optionalString("bellIconName"),
  )
}
