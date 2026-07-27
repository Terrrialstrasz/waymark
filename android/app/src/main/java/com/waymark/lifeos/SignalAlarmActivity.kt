package com.waymark.lifeos

import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.appcompat.widget.AppCompatImageView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

class SignalAlarmActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
      )
    }

    WindowCompat.setDecorFitsSystemWindows(window, false)
    renderFromIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    renderFromIntent(intent)
  }

  private fun renderFromIntent(sourceIntent: Intent) {
    val model = AlarmUiModel.fromIntent(sourceIntent)
    setContentView(buildContent(model))
  }

  private fun buildContent(model: AlarmUiModel): View {
    val scrollView = ScrollView(this).apply {
      isFillViewport = true
      setBackgroundColor(COLOR_PARCHMENT_BG)
      overScrollMode = View.OVER_SCROLL_NEVER
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }

    val container = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL or Gravity.CENTER_VERTICAL
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
      setBackgroundColor(COLOR_PARCHMENT_BG)
    }

    ViewCompat.setOnApplyWindowInsetsListener(container) { view, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      view.setPadding(
        dp(SPACING_SCREEN_X) + bars.left,
        dp(28) + bars.top,
        dp(SPACING_SCREEN_X) + bars.right,
        dp(28) + bars.bottom,
      )
      insets
    }

    container.addView(createSpacer(20))
    container.addView(createBellEmblem(model.bellIconName))
    container.addView(createSpacer(28))
    container.addView(createLabel())
    container.addView(createSpacer(12))
    container.addView(createSignalTitle(model.signalTitle))
    container.addView(createSpacer(18))
    container.addView(createDivider())
    container.addView(createSpacer(28))
    container.addView(createTargetCard(model))
    container.addView(createSpacer(28))
    container.addView(
      createActionButton(
        label = "OPEN",
        iconName = "waymark_utility_bell",
        fillColor = COLOR_GOLD_PRIMARY,
        borderColor = COLOR_GOLD_PRIMARY,
        textColor = Color.WHITE,
        shadow = 5f,
      ) { button ->
        button.isEnabled = false
        button.alpha = 0.72f
        sendAction(model, SignalAlarmSupport.ACTION_OPEN)
      },
    )
    container.addView(createSpacer(14))
    container.addView(createSecondaryActionsRow(model))
    container.addView(createSpacer(20))

    scrollView.addView(container)
    return scrollView
  }

  private fun createBellEmblem(iconName: String?): View {
    val iconResource = resolveDrawableId(iconName ?: "waymark_alarm_bell_emblem", "waymark_alarm_bell_emblem")
    return FrameLayout(this).apply {
      layoutParams = LinearLayout.LayoutParams(dp(84), dp(84))
      background = roundedDrawable(
        fillColor = COLOR_EMBLEM_BG,
        strokeColor = COLOR_BORDER_SUBTLE,
        radiusDp = 42f,
      )
      ViewCompat.setElevation(this, dpFloat(6f))
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
      addView(
        AppCompatImageView(context).apply {
          layoutParams = FrameLayout.LayoutParams(dp(42), dp(42), Gravity.CENTER)
          setImageResource(iconResource)
          importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        },
      )
    }
  }

  private fun createLabel(): TextView {
    return TextView(this).apply {
      text = "Waymark is calling"
      gravity = Gravity.CENTER
      setTextColor(COLOR_INK_MUTED)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
      setTypeface(Typeface.SANS_SERIF, Typeface.NORMAL)
    }
  }

  private fun createSignalTitle(signalTitle: String): TextView {
    return TextView(this).apply {
      text = signalTitle
      gravity = Gravity.CENTER
      setTextColor(COLOR_INK_PRIMARY)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 38f)
      typeface = Typeface.create("serif", Typeface.NORMAL)
      maxLines = 2
      ellipsize = TextUtils.TruncateAt.END
      setLineSpacing(0f, 0.92f)
    }
  }

  private fun createDivider(): View {
    return LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      addView(createDividerLine())
      addView(View(context).apply {
        layoutParams = LinearLayout.LayoutParams(dp(8), dp(8)).apply {
          marginStart = dp(8)
          marginEnd = dp(8)
        }
        background = roundedDrawable(
          fillColor = COLOR_GOLD_SOFT,
          strokeColor = COLOR_GOLD_SOFT,
          radiusDp = 4f,
        )
        rotation = 45f
      })
      addView(createDividerLine())
    }
  }

  private fun createDividerLine(): View {
    return View(this).apply {
      layoutParams = LinearLayout.LayoutParams(dp(56), dp(1))
      setBackgroundColor(COLOR_BORDER_SUBTLE)
    }
  }

  private fun createTargetCard(model: AlarmUiModel): View {
    val card = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      )
      background = roundedDrawable(
        fillColor = COLOR_VELLUM_CARD,
        strokeColor = COLOR_BORDER_SUBTLE,
        radiusDp = RADIUS_CARD.toFloat(),
      )
      ViewCompat.setElevation(this, dpFloat(8f))
      setPadding(dp(18), dp(18), dp(18), dp(18))
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
      contentDescription = model.targetTitle
    }

    val iconBadge = FrameLayout(this).apply {
      layoutParams = LinearLayout.LayoutParams(dp(76), dp(76)).apply {
        marginEnd = dp(18)
      }
      background = roundedDrawable(
        fillColor = COLOR_ICON_BADGE_BG,
        strokeColor = COLOR_BORDER_SUBTLE,
        radiusDp = 38f,
      )
      addView(
        AppCompatImageView(context).apply {
          layoutParams = FrameLayout.LayoutParams(dp(38), dp(38), Gravity.CENTER)
          scaleType = ImageView.ScaleType.FIT_CENTER
          setImageResource(resolveDrawableId(model.targetIconName, "waymark_pack_check_generic"))
          imageTintList = ColorStateList.valueOf(COLOR_INK_PRIMARY)
        },
      )
    }

    val titleView = TextView(this).apply {
      text = model.targetTitle
      setTextColor(COLOR_INK_PRIMARY)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
      typeface = Typeface.create("serif", Typeface.BOLD)
      maxLines = 2
      ellipsize = TextUtils.TruncateAt.END
      layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
    }

    card.addView(iconBadge)
    card.addView(titleView)
    return card
  }

  private fun createSecondaryActionsRow(model: AlarmUiModel): View {
    val row = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      )
    }

    val snoozeButton = createActionButton(
      label = "SNOOZE 5M",
      iconName = "waymark_utility_clock",
      fillColor = COLOR_BUTTON_SECONDARY,
      borderColor = COLOR_BORDER_SUBTLE,
      textColor = COLOR_INK_PRIMARY,
      shadow = 3f,
      textSizeSp = 16f,
      horizontalPaddingDp = 18,
    ) { button ->
      button.isEnabled = false
      button.alpha = 0.72f
      sendAction(model, SignalAlarmSupport.ACTION_SNOOZE)
    }

    val dismissButton = createActionButton(
      label = "DISMISS",
      iconName = "waymark_utility_close",
      fillColor = COLOR_VELLUM_CARD,
      borderColor = COLOR_BORDER_OUTLINE,
      textColor = COLOR_INK_MUTED,
      shadow = 1f,
      textSizeSp = 16f,
      horizontalPaddingDp = 18,
    ) { button ->
      button.isEnabled = false
      button.alpha = 0.72f
      sendAction(model, SignalAlarmSupport.ACTION_DISMISS)
    }

    snoozeButton.layoutParams = LinearLayout.LayoutParams(0, dp(72), 1f).apply {
      marginEnd = dp(8)
    }
    dismissButton.layoutParams = LinearLayout.LayoutParams(0, dp(72), 1f).apply {
      marginStart = dp(8)
    }

    row.addView(snoozeButton)
    row.addView(dismissButton)
    return row
  }

  private fun createActionButton(
    label: String,
    iconName: String,
    fillColor: Int,
    borderColor: Int,
    textColor: Int,
    shadow: Float,
    textSizeSp: Float = 20f,
    horizontalPaddingDp: Int = 0,
    onClick: (LinearLayout) -> Unit,
  ): View {
    val button = LinearLayout(this).apply {
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        dp(72),
      )
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(dp(horizontalPaddingDp), 0, dp(horizontalPaddingDp), 0)
      isClickable = true
      isFocusable = true
      background = roundedDrawable(
        fillColor = fillColor,
        strokeColor = borderColor,
        radiusDp = RADIUS_BUTTON.toFloat(),
      )
      ViewCompat.setElevation(this, dpFloat(shadow))
      contentDescription = when (label) {
        "OPEN" -> "Open signal"
        "SNOOZE 5M" -> "Snooze for 5 minutes"
        else -> "Dismiss signal"
      }
      setOnClickListener { onClick(this) }
    }

    val contentRow = LinearLayout(this).apply {
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.WRAP_CONTENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      )
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    val icon = AppCompatImageView(this).apply {
      layoutParams = LinearLayout.LayoutParams(dp(26), dp(26)).apply {
        marginEnd = dp(14)
      }
      scaleType = ImageView.ScaleType.FIT_CENTER
      setImageResource(resolveDrawableId(iconName, "waymark_utility_bell"))
      imageTintList = ColorStateList.valueOf(textColor)
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    val textView = TextView(this).apply {
      text = label
      gravity = Gravity.CENTER
      setTextColor(textColor)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, textSizeSp)
      setTypeface(Typeface.SANS_SERIF, Typeface.BOLD)
      letterSpacing = 0f
      includeFontPadding = false
      maxLines = 1
      ellipsize = TextUtils.TruncateAt.END
    }

    contentRow.addView(icon)
    contentRow.addView(textView)
    button.addView(contentRow)
    return button
  }

  private fun createSpacer(heightDp: Int): View {
    return View(this).apply {
      layoutParams = LinearLayout.LayoutParams(1, dp(heightDp))
    }
  }

  private fun roundedDrawable(
    fillColor: Int,
    strokeColor: Int,
    radiusDp: Float,
  ) = android.graphics.drawable.GradientDrawable().apply {
    shape = android.graphics.drawable.GradientDrawable.RECTANGLE
    cornerRadius = dpFloat(radiusDp)
    setColor(fillColor)
    setStroke(dp(1), strokeColor)
  }

  private fun resolveDrawableId(resourceName: String?, fallbackName: String): Int {
    val names = listOfNotNull(resourceName, fallbackName)
    for (name in names) {
      val drawableId = resources.getIdentifier(name, "drawable", packageName)
      if (drawableId != 0) {
        return drawableId
      }
      val mipmapId = resources.getIdentifier(name, "mipmap", packageName)
      if (mipmapId != 0) {
        return mipmapId
      }
    }
    return android.R.drawable.ic_lock_idle_alarm
  }

  private fun sendAction(model: AlarmUiModel, action: String) {
    sendBroadcast(
      Intent(this, SignalAlarmActionReceiver::class.java).apply {
        this.action = action
        putExtra(SignalAlarmSupport.EXTRA_ALARM_ID, model.alarmId)
        putExtra(SignalAlarmSupport.EXTRA_TITLE, model.legacyTitle)
        putExtra(SignalAlarmSupport.EXTRA_BODY, model.legacyBody)
        putExtra(SignalAlarmSupport.EXTRA_SIGNAL_TITLE, model.signalTitle)
        putExtra(SignalAlarmSupport.EXTRA_TARGET_TITLE, model.targetTitle)
        putExtra(SignalAlarmSupport.EXTRA_TARGET_KIND, model.targetKind)
        putExtra(SignalAlarmSupport.EXTRA_TARGET_ICON_NAME, model.targetIconName)
        putExtra(SignalAlarmSupport.EXTRA_BELL_ICON_NAME, model.bellIconName)
      },
    )
    finish()
  }

  private fun dp(value: Int): Int {
    return TypedValue.applyDimension(
      TypedValue.COMPLEX_UNIT_DIP,
      value.toFloat(),
      resources.displayMetrics,
    ).toInt()
  }

  private fun dpFloat(value: Float): Float {
    return TypedValue.applyDimension(
      TypedValue.COMPLEX_UNIT_DIP,
      value,
      resources.displayMetrics,
    )
  }

  private data class AlarmUiModel(
    val alarmId: String,
    val legacyTitle: String,
    val legacyBody: String,
    val signalTitle: String,
    val targetTitle: String,
    val targetKind: String?,
    val targetIconName: String?,
    val bellIconName: String?,
  ) {
    companion object {
      fun fromIntent(intent: Intent): AlarmUiModel {
        val legacyTitle = intent.getStringExtra(SignalAlarmSupport.EXTRA_TITLE)?.takeIf { it.isNotBlank() } ?: "Waymark"
        val legacyBody = intent.getStringExtra(SignalAlarmSupport.EXTRA_BODY)?.takeIf { it.isNotBlank() } ?: ""
        val signalTitle = intent.getStringExtra(SignalAlarmSupport.EXTRA_SIGNAL_TITLE)?.takeIf { it.isNotBlank() } ?: legacyTitle
        val targetTitle = intent.getStringExtra(SignalAlarmSupport.EXTRA_TARGET_TITLE)?.takeIf { it.isNotBlank() } ?: legacyBody

        return AlarmUiModel(
          alarmId = intent.getStringExtra(SignalAlarmSupport.EXTRA_ALARM_ID) ?: SignalAlarmSupport.TEST_ALARM_ID,
          legacyTitle = legacyTitle,
          legacyBody = legacyBody,
          signalTitle = signalTitle,
          targetTitle = targetTitle,
          targetKind = intent.getStringExtra(SignalAlarmSupport.EXTRA_TARGET_KIND),
          targetIconName = intent.getStringExtra(SignalAlarmSupport.EXTRA_TARGET_ICON_NAME),
          bellIconName = intent.getStringExtra(SignalAlarmSupport.EXTRA_BELL_ICON_NAME),
        )
      }
    }
  }

  companion object {
    private const val SPACING_SCREEN_X = 22
    private const val RADIUS_CARD = 22
    private const val RADIUS_BUTTON = 22

    private val COLOR_PARCHMENT_BG = Color.parseColor("#F6ECDD")
    private val COLOR_VELLUM_CARD = Color.parseColor("#FCF6ED")
    private val COLOR_EMBLEM_BG = Color.parseColor("#FFF4E5")
    private val COLOR_ICON_BADGE_BG = Color.parseColor("#F4E7D6")
    private val COLOR_INK_PRIMARY = Color.parseColor("#4B3624")
    private val COLOR_INK_MUTED = Color.parseColor("#6F5B49")
    private val COLOR_GOLD_PRIMARY = Color.parseColor("#B97A27")
    private val COLOR_GOLD_SOFT = Color.parseColor("#D9B176")
    private val COLOR_BUTTON_SECONDARY = Color.parseColor("#FBF4E7")
    private val COLOR_BORDER_SUBTLE = Color.parseColor("#D9C2A2")
    private val COLOR_BORDER_OUTLINE = Color.parseColor("#C9B69B")
  }
}
