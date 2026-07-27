package com.waymark.lifeos

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class SignalAlarmActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val alarmId = intent.getStringExtra(SignalAlarmSupport.EXTRA_ALARM_ID) ?: SignalAlarmSupport.TEST_ALARM_ID
    val title = intent.getStringExtra(SignalAlarmSupport.EXTRA_TITLE) ?: "Waymark Signal Test"
    val body = intent.getStringExtra(SignalAlarmSupport.EXTRA_BODY) ?: "This is a native signal alarm test."
    val presentation = SignalAlarmSupport.readPresentationFromIntent(intent)

    when (intent.action) {
      SignalAlarmSupport.ACTION_SNOOZE -> {
        SignalAlarmSupport.cancelAlarm(context, alarmId)
        SignalAlarmSupport.scheduleExactAlarm(context, alarmId, title, body, presentation, System.currentTimeMillis() + 5 * 60_000L)
        SignalAlarmSupport.launchAppFromAlarm(context, alarmId, "snooze")
      }
      SignalAlarmSupport.ACTION_DISMISS -> {
        SignalAlarmSupport.cancelAlarm(context, alarmId)
        SignalAlarmSupport.launchAppFromAlarm(context, alarmId, "dismiss")
      }
      else -> {
        SignalAlarmSupport.cancelAlarm(context, alarmId)
        SignalAlarmSupport.launchAppFromAlarm(context, alarmId, "open")
      }
    }
  }
}
