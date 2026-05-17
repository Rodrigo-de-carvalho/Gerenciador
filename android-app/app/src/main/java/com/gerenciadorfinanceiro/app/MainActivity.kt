package com.gerenciadorfinanceiro.app

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.webkit.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.net.toUri
import com.gerenciadorfinanceiro.app.BuildConfig
import com.gerenciadorfinanceiro.app.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val APP_URL = "https://gerenciador-psi.vercel.app"

    private val MOBILE_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/121.0.0.0 Mobile Safari/537.36"

    private val INJECTED_CSS = """
        (function() {
            var s = document.createElement('style');
            s.id = '__android_app_style__';
            s.textContent = '.crumbs { display: none !important; }';
            if (!document.getElementById('__android_app_style__')) {
                document.head.appendChild(s);
            }
        })();
    """.trimIndent()

    // Rastreia scroll via JS para o pull-to-refresh
    @Volatile private var webScrollY = 0

    // Sinaliza que um Chrome Custom Tab foi aberto (OAuth Google)
    private var customTabOpened = false
    // Sinaliza que o fluxo OAuth foi iniciado — NÃO limpo pelo onNewIntent
    private var oauthFlowStarted = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupWebView()
        setupSwipeRefresh()

        if (savedInstanceState == null) {
            val intentUrl = intent?.data?.toString()
            binding.webView.loadUrl(
                if (!intentUrl.isNullOrEmpty() && intentUrl.startsWith(APP_URL)) intentUrl
                else APP_URL
            )
        }

        checkForUpdates()
    }

    // ---------- Update check ----------

    private fun checkForUpdates() {
        Thread {
            try {
                val conn = java.net.URL("$APP_URL/version.json").openConnection() as java.net.HttpURLConnection
                conn.connectTimeout = 6000
                conn.readTimeout = 6000
                conn.setRequestProperty("Cache-Control", "no-cache")
                val text = conn.inputStream.bufferedReader().readText()
                conn.disconnect()
                val obj = org.json.JSONObject(text)
                val latest = obj.getInt("version")
                val dlUrl = obj.optString("url", "$APP_URL/downloads/gerenciador-financeiro.apk")
                if (latest > BuildConfig.VERSION_CODE) {
                    runOnUiThread { showUpdateDialog(dlUrl) }
                }
            } catch (_: Exception) {}
        }.start()
    }

    private fun showUpdateDialog(downloadUrl: String) {
        AlertDialog.Builder(this)
            .setTitle("Nova versão disponível")
            .setMessage("Uma atualização do Cifra está disponível. Deseja baixar agora?")
            .setPositiveButton("Atualizar") { _, _ ->
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)))
                } catch (_: Exception) {}
            }
            .setNegativeButton("Agora não", null)
            .setCancelable(true)
            .show()
    }

    // ---------- Deep link ----------

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        customTabOpened = false
        val url = intent?.data?.toString() ?: return
        when {
            // Chrome Custom Tab returned PKCE code via custom scheme → load in WebView
            url.startsWith("cifra://callback") -> {
                val query = intent.data?.query ?: ""
                binding.webView.loadUrl("$APP_URL${if (query.isNotEmpty()) "?$query" else ""}")
            }
            url.startsWith(APP_URL) -> binding.webView.loadUrl(url)
        }
    }

    // ---------- WebView ----------

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val webView = binding.webView

        webView.settings.apply {
            javaScriptEnabled = true
            javaScriptCanOpenWindowsAutomatically = true
            domStorageEnabled = true
            databaseEnabled = true
            userAgentString = MOBILE_UA
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            defaultFontSize = 16
        }

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        // Interface JS → Kotlin para rastrear scroll e corrigir pull-to-refresh
        webView.addJavascriptInterface(object {
            @JavascriptInterface
            fun onScroll(y: Int) { webScrollY = y }
        }, "CifraApp")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url    = request.url.toString()
                val host   = request.url.host ?: ""
                val scheme = request.url.scheme ?: ""

                return when {
                    host.contains("gerenciador-psi.vercel.app") -> false
                    host.contains("supabase.co")                -> false
                    // Google OAuth: Chrome Custom Tab para acessar contas do dispositivo
                    host == "accounts.google.com" || host.endsWith(".googleapis.com") -> {
                        customTabOpened = true
                        oauthFlowStarted = true
                        try {
                            CustomTabsIntent.Builder()
                                .setColorSchemeParams(
                                    CustomTabsIntent.COLOR_SCHEME_DARK,
                                    CustomTabColorSchemeParams.Builder()
                                        .setToolbarColor(0xFF0E0D0B.toInt())
                                        .build()
                                )
                                .build()
                                .launchUrl(this@MainActivity, request.url)
                        } catch (_: Exception) {
                            startActivity(Intent(Intent.ACTION_VIEW, url.toUri()))
                        }
                        true
                    }
                    scheme == "https" || scheme == "http" -> {
                        try { startActivity(Intent(Intent.ACTION_VIEW, url.toUri())) } catch (_: Exception) {}
                        true
                    }
                    else -> true
                }
            }

            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                binding.progressBar.visibility = View.VISIBLE
                binding.swipeRefresh.isRefreshing = false
            }

            override fun onPageFinished(view: WebView, url: String) {
                binding.progressBar.visibility = View.GONE
                CookieManager.getInstance().flush()
                view.evaluateJavascript(INJECTED_CSS, null)
                view.evaluateJavascript("""
                    (function(){
                        var last=-1;
                        document.addEventListener('scroll',function(e){
                            var y=Math.round((e.target&&e.target.scrollTop)||0);
                            if(y!==last){last=y;try{CifraApp.onScroll(y);}catch(ex){}}
                        },{capture:true,passive:true});
                    })();
                """.trimIndent(), null)

            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) {
                    view.loadData(
                        """<html><body style="font-family:sans-serif;display:flex;flex-direction:column;
                        align-items:center;justify-content:center;height:100vh;margin:0;
                        background:#111;color:#fff;text-align:center;padding:20px;">
                        <div style="font-size:48px;margin-bottom:16px;">📶</div>
                        <div style="font-size:18px;font-weight:600;margin-bottom:8px;">Sem conexão</div>
                        <div style="font-size:14px;color:#aaa;margin-bottom:24px;">Verifique sua internet e tente novamente.</div>
                        <button onclick="location.reload()" style="padding:12px 24px;border-radius:8px;
                        border:none;background:#c7f284;color:#111;font-size:15px;font-weight:600;
                        cursor:pointer;">Tentar novamente</button></body></html>""",
                        "text/html", "UTF-8"
                    )
                    binding.progressBar.visibility = View.GONE
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                binding.progressBar.progress = newProgress
                if (newProgress == 100) binding.progressBar.visibility = View.GONE
            }
            override fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean {
                result.confirm(); return false
            }
            override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean {
                result.confirm(); return false
            }
        }
    }

    // ---------- Swipe refresh ----------

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.apply {
            setColorSchemeColors(0xFFC7F284.toInt())
            setProgressBackgroundColorSchemeColor(0xFF1A1A1A.toInt())
            setOnRefreshListener {
                binding.webView.reload()
                isRefreshing = false
            }
        }
    }

    // ---------- Touch dispatch — disables SwipeRefresh when not at top ----------

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        if (ev.action == MotionEvent.ACTION_DOWN) {
            binding.swipeRefresh.isEnabled = webScrollY <= 0
        }
        return super.dispatchTouchEvent(ev)
    }

    // ---------- Lifecycle ----------

    override fun onResume() {
        super.onResume()
        binding.webView.onResume()
        when {
            oauthFlowStarted -> {
                // OAuth completou (com ou sem App Link): recarrega após troca PKCE terminar
                oauthFlowStarted = false
                binding.webView.postDelayed({ binding.webView.reload() }, 1000)
            }
            customTabOpened -> {
                // Custom Tab fechou sem App Link — tenta recuperar sessão via JS
                binding.webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('cifra-oauth-resume'));", null
                )
            }
        }
        customTabOpened = false
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && binding.webView.canGoBack()) {
            binding.webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        binding.webView.restoreState(savedInstanceState)
    }

    override fun onPause() {
        super.onPause()
        binding.webView.onPause()
        CookieManager.getInstance().flush()
    }

    override fun onDestroy() {
        binding.webView.destroy()
        super.onDestroy()
    }
}
