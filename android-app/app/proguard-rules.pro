# Regras ProGuard para o app WebView

# Mantém a MainActivity e WebView intact
-keep class com.gerenciadorfinanceiro.app.** { *; }

# WebView com JavaScript
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Kotlin coroutines (caso sejam adicionadas)
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
