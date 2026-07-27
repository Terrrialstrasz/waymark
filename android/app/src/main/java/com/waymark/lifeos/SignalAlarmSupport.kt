package com.waymark.lifeos

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.lang.Math.abs

data class AlarmPresentationPayload(
  val signalTitle: String? = null,
  val targetTitle: String? = null,
  val targetKind: String? = null,
  val targetIconName: String? = null,
  val bellIconName: String? = null,
)

object SignalAlarmSupport {
  const val PREFS_NAME = "waymark_signal_alarm"
  const val PREF_LAST_ACTION = "last_action"
  const val PREF_LAST_FIRED_AT = "last_fired_at"
  const val PREF_LAST_SCHEDULED_AT = "last_scheduled_at"
  const val PREF_LAST_ALARM_ID = "last_alarm_id"
  const val PREF_LAST_TITLE = "last_title"
  const val PREF_LAST_BODY = "last_body"

  const val CHANNEL_ID = "waymark_signal_alarm_native"
  const val TEST_ALARM_ID = "dev_signal_alarm_test"

  const val EXTRA_ALARM_ID = "extra_alarm_id"
  const val EXTRA_TITLE = "extra_title"
  const val EXTRA_BODY = "extra_body"
  const val EXTRA_TRIGGER_AT = "extra_trigger_at"
  const val EXTRA_ACTION = "extra_action"
  const val EXTRA_SIGNAL_TITLE = "extra_signal_title"
  const val EXTRA_TARGET_TITLE = "extra_target_title"
  const val EXTRA_TARGET_KIND = "extra_target_kind"
  const val EXTRA_TARGET_ICON_NAME = "extra_target_icon_name"
  const val EXTRA_BELL_ICON_NAME = "extra_bell_icon_name"

  const val ACTION_FIRE = "com.waymark.lifeos.ACTION_SIGNAL_ALARM_FIRE"
  const val ACTION_OPEN = "com.waymark.lifeos.ACTION_SIGNAL_ALARM_OPEN"
  const val ACTION_SNOOZE = "com.waymark.lifeos.ACTION_SIGNAL_ALARM_SNOOZE"
  const val ACTION_DISMISS = "com.waymark.lifeos.ACTION_SIGNAL_ALARM_DISMISS"

  const val NOTIFICATION_ID_BASE = 48000

  fun ensureNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (notificationManager.getNotificationChannel(CHANNEL_ID) != null) {
      return
    }

    val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    val audioAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    val channel = NotificationChannel(CHANNEL_ID, "Waymark Signal Alarms", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Strict Waymark signal alarms"
      enableVibration(true)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setSound(soundUri, audioAttributes)
    }

    notificationManager.createNotificationChannel(channel)
  }

  fun canScheduleExactAlarms(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return true
    }
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return alarmManager.canScheduleExactAlarms()
  }

  fun canUseFullScreenIntent(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return true
    }
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    return notificationManager.canUseFullScreenIntent()
  }

  fun notificationPermissionGranted(context: Context): Boolean {
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
      return false
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return true
    }
    return ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED
  }

  fun ignoringBatteryOptimizations(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return true
    }
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    return powerManager.isIgnoringBatteryOptimizations(context.packageName)
  }

  fun scheduleExactAlarm(
    context: Context,
    alarmId: String,
    title: String,
    body: String,
    presentation: AlarmPresentationPayload? = null,
    triggerAtMillis: Long,
  ) {
    ensureNotificationChannel(context)

    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pendingIntent = buildFirePendingIntent(context, alarmId, title, body, presentation, triggerAtMillis)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
    } else {
      alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
    }

    writeLedger(
      context = context,
      alarmId = alarmId,
      title = title,
      body = body,
      scheduledAt = triggerAtMillis,
      action = "scheduled",
      firedAt = null,
    )
  }

  fun cancelAlarm(context: Context, alarmId: String) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.cancel(buildFirePendingIntent(context, alarmId, "", "", null, 0L))
    NotificationManagerCompat.from(context).cancel(notificationIdForAlarm(alarmId))
    writeLedger(
      context = context,
      alarmId = alarmId,
      title = currentTitle(context),
      body = currentBody(context),
      scheduledAt = 0L,
      action = "cancelled",
      firedAt = null,
    )
  }

  fun showAlarmNotification(context: Context, alarmId: String, title: String, body: String, presentation: AlarmPresentationPayload? = null) {
    ensureNotificationChannel(context)

    val openIntent = buildActionPendingIntent(context, alarmId, title, body, presentation, ACTION_OPEN)
    val snoozeIntent = buildActionPendingIntent(context, alarmId, title, body, presentation, ACTION_SNOOZE)
    val dismissIntent = buildActionPendingIntent(context, alarmId, title, body, presentation, ACTION_DISMISS)
    val fullScreenIntent = buildFullScreenPendingIntent(context, alarmId, title, body, presentation)
    val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setSound(soundUri)
      .setOngoing(true)
      .setAutoCancel(false)
      .setFullScreenIntent(fullScreenIntent, true)
      .setContentIntent(fullScreenIntent)
      .addAction(0, "Open", openIntent)
      .addAction(0, "Snooze 5m", snoozeIntent)
      .addAction(0, "Dismiss", dismissIntent)
      .build()

    NotificationManagerCompat.from(context).notify(notificationIdForAlarm(alarmId), notification)
    writeLedger(
      context = context,
      alarmId = alarmId,
      title = title,
      body = body,
      scheduledAt = currentScheduledAt(context),
      action = "fired",
      firedAt = System.currentTimeMillis(),
    )
  }

  fun launchAppFromAlarm(context: Context, alarmId: String, action: String) {
    val host = if (alarmId == TEST_ALARM_ID) "alarm-test" else "signal-alarm"
    val deepLink = Uri.Builder()
      .scheme("exp+waymark")
      .authority(host)
      .appendQueryParameter("alarmId", alarmId)
      .appendQueryParameter("action", action)
      .build()
    val intent = Intent(Intent.ACTION_VIEW, deepLink).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    context.startActivity(intent)
  }

  fun openNotificationSettings(context: Context) {
    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
      putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
  }

  fun openExactAlarmSettings(context: Context) {
    val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
  }

  fun openFullScreenIntentSettings(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      openNotificationSettings(context)
      return
    }
    val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${context.packageName}")).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
  }

  private fun buildFirePendingIntent(
    context: Context,
    alarmId: String,
    title: String,
    body: String,
    presentation: AlarmPresentationPayload?,
    triggerAtMillis: Long,
  ): PendingIntent {
    val intent = Intent(context, SignalAlarmReceiver::class.java).apply {
      action = ACTION_FIRE
      putExtra(EXTRA_ALARM_ID, alarmId)
      putExtra(EXTRA_TITLE, title)
      putExtra(EXTRA_BODY, body)
      putExtra(EXTRA_TRIGGER_AT, triggerAtMillis)
      applyPresentationExtras(this, presentation)
    }
    return PendingIntent.getBroadcast(
      context,
      notificationIdForAlarm(alarmId),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun buildActionPendingIntent(
    context: Context,
    alarmId: String,
    title: String,
    body: String,
    presentation: AlarmPresentationPayload?,
    action: String,
  ): PendingIntent {
    val intent = Intent(context, SignalAlarmActionReceiver::class.java).apply {
      this.action = action
      putExtra(EXTRA_ALARM_ID, alarmId)
      putExtra(EXTRA_TITLE, title)
      putExtra(EXTRA_BODY, body)
      putExtra(EXTRA_ACTION, action)
      applyPresentationExtras(this, presentation)
    }
    return PendingIntent.getBroadcast(
      context,
      notificationIdForAlarm("$alarmId:$action"),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun buildFullScreenPendingIntent(
    context: Context,
    alarmId: String,
    title: String,
    body: String,
    presentation: AlarmPresentationPayload?,
  ): PendingIntent {
    val intent = Intent(context, SignalAlarmActivity::class.java).apply {
      putExtra(EXTRA_ALARM_ID, alarmId)
      putExtra(EXTRA_TITLE, title)
      putExtra(EXTRA_BODY, body)
      applyPresentationExtras(this, presentation)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    return PendingIntent.getActivity(
      context,
      notificationIdForAlarm("$alarmId:activity"),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun notificationIdForAlarm(alarmId: String): Int {
    return NOTIFICATION_ID_BASE + abs(alarmId.hashCode()) % 10000
  }

  private fun writeLedger(
    context: Context,
    alarmId: String,
    title: String,
    body: String,
    scheduledAt: Long,
    action: String,
    firedAt: Long?,
  ) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(PREF_LAST_ALARM_ID, alarmId)
      .putString(PREF_LAST_TITLE, title)
      .putString(PREF_LAST_BODY, body)
      .putLong(PREF_LAST_SCHEDULED_AT, scheduledAt)
      .putString(PREF_LAST_ACTION, action)
      .putLong(PREF_LAST_FIRED_AT, firedAt ?: 0L)
      .apply()
  }

  fun currentScheduledAt(context: Context): Long {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getLong(PREF_LAST_SCHEDULED_AT, 0L)
  }

  fun currentTitle(context: Context): String {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(PREF_LAST_TITLE, "") ?: ""
  }

  fun currentBody(context: Context): String {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(PREF_LAST_BODY, "") ?: ""
  }

  fun readPresentationFromIntent(intent: Intent): AlarmPresentationPayload {
    return AlarmPresentationPayload(
      signalTitle = intent.getStringExtra(EXTRA_SIGNAL_TITLE),
      targetTitle = intent.getStringExtra(EXTRA_TARGET_TITLE),
      targetKind = intent.getStringExtra(EXTRA_TARGET_KIND),
      targetIconName = intent.getStringExtra(EXTRA_TARGET_ICON_NAME),
      bellIconName = intent.getStringExtra(EXTRA_BELL_ICON_NAME),
    )
  }

  private fun applyPresentationExtras(intent: Intent, presentation: AlarmPresentationPayload?) {
    if (presentation == null) {
      return
    }
    intent.putExtra(EXTRA_SIGNAL_TITLE, presentation.signalTitle)
    intent.putExtra(EXTRA_TARGET_TITLE, presentation.targetTitle)
    intent.putExtra(EXTRA_TARGET_KIND, presentation.targetKind)
    intent.putExtra(EXTRA_TARGET_ICON_NAME, presentation.targetIconName)
    intent.putExtra(EXTRA_BELL_ICON_NAME, presentation.bellIconName)
  }
}
