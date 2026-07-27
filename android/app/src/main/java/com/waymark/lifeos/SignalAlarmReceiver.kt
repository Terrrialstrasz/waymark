package com.waymark.lifeos

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class SignalAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val alarmId = intent.getStringExtra(SignalAlarmSupport.EXTRA_ALARM_ID) ?: SignalAlarmSupport.TEST_ALARM_ID
    val title = intent.getStringExtra(SignalAlarmSupport.EXTRA_TITLE) ?: "Waymark Signal Test"
    val body = intent.getStringExtra(SignalAlarmSupport.EXTRA_BODY) ?: "This is a native signal alarm test."
    val presentation = SignalAlarmSupport.readPresentationFromIntent(intent)
    SignalAlarmSupport.showAlarmNotification(context, alarmId, title, body, presentation)
  }
}
