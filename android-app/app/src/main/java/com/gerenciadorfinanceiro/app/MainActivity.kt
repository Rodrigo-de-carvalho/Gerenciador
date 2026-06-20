package com.gerenciadorfinanceiro.app

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.webkit.*
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.FileProvider
import androidx.core.net.toUri
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import com.gerenciadorfinanceiro.app.BuildConfig
import com.gerenciadorfinanceiro.app.databinding.ActivityMainBinding
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val APP_URL = "https://gerenciador-psi.vercel.app"

    // APK update download state
    private var downloadId = -1L
    private var downloadReceiver: BroadcastReceiver? = null

    // File chooser callback for <input type="file"> in the WebView
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        val result = if (uri != null) arrayOf(uri) else null
        fileChooserCallback?.onReceiveValue(result)
        fileChooserCallback = null
    }

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
                startApkDownload(downloadUrl)
            }
            .setNegativeButton("Agora não", null)
            .setCancelable(true)
            .show()
    }

    private fun startApkDownload(url: String) {
        // Limpa APK antigo, se houver
        val apkFile = File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "cifra-update.apk")
        if (apkFile.exists()) apkFile.delete()

        val progressDialog = AlertDialog.Builder(this)
            .setTitle("Baixando atualização…")
            .setMessage("Por favor, aguarde. A instalação iniciará automaticamente.")
            .setCancelable(false)
            .show()

        val request = DownloadManager.Request(Uri.parse(url)).apply {
            setTitle("Cifra — Nova versão")
            setDescription("Baixando atualização…")
            setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            setMimeType("application/vnd.android.package-archive")
            setDestinationInExternalFilesDir(
                this@MainActivity,
                Environment.DIRECTORY_DOWNLOADS,
                "cifra-update.apk"
            )
        }

        val dm = getSystemService(DOWNLOAD_SERVICE) as DownloadManager
        downloadId = dm.enqueue(request)

        // Unregister any previous receiver that might have leaked
        downloadReceiver?.let { try { unregisterReceiver(it) } catch (_: Exception) {} }

        downloadReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
                if (completedId != downloadId) return

                // Cleanup
                try { unregisterReceiver(this) } catch (_: Exception) {}
                downloadReceiver = null

                progressDialog.dismiss()

                // Verify download success
                val query = DownloadManager.Query().setFilterById(downloadId)
                val cursor = dm.query(query)
                val success = cursor.use { c ->
                    c.moveToFirst() &&
                    c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)) == DownloadManager.STATUS_SUCCESSFUL
                }

                if (!success) {
                    Toast.makeText(this@MainActivity, "Falha no download. Tente novamente.", Toast.LENGTH_LONG).show()
                    return
                }

                installApk(apkFile)
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(
                downloadReceiver,
                IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                Context.RECEIVER_EXPORTED
            )
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(downloadReceiver, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE))
        }
    }

    private fun installApk(file: File) {
        if (!file.exists()) {
            Toast.makeText(this, "Arquivo não encontrado. Tente novamente.", Toast.LENGTH_LONG).show()
            return
        }

        // Android 8+ requires explicit permission to install unknown sources
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
            AlertDialog.Builder(this)
                .setTitle("Permissão necessária")
                .setMessage("Para instalar a atualização, habilite a instalação de fontes desconhecidas para o Cifra nas configurações.")
                .setPositiveButton("Abrir configurações") { _, _ ->
                    startActivity(
                        Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:$packageName")
                        )
                    )
                }
                .setNegativeButton("Cancelar", null)
                .show()
            return
        }

        val uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            FileProvider.getUriForFile(this, "$packageName.provider", file)
        } else {
            Uri.fromFile(file)
        }

        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
        }

        try {
            startActivity(installIntent)
        } catch (e: Exception) {
            Toast.makeText(this, "Erro ao abrir instalador. Tente novamente.", Toast.LENGTH_LONG).show()
        }
    }

    // ---------- Deep link ----------

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        customTabOpened = false
        val url = intent?.data?.toString() ?: return
        when {
            // Chrome Custom Tab returned OAuth callback via custom scheme.
            // Supabase PKCE sends code as query param (?code=...) or
            // implicit flow uses fragment (#access_token=...).
            // Forward both back into the WebView so Supabase JS can finish
            // the session exchange inside the app.
            url.startsWith("cifra://callback") -> {
                val uri      = intent.data ?: return
                val fragment = uri.fragment ?: ""
                val query    = uri.query    ?: ""
                val target   = when {
                    fragment.isNotEmpty() -> "$APP_URL/#$fragment"
                    query.isNotEmpty()    -> "$APP_URL/?$query"
                    else                  -> APP_URL
                }
                binding.webView.loadUrl(target)
            }
            url.startsWith(APP_URL) -> binding.webView.loadUrl(url)
        }
    }

    // ---------- WebView ----------

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val webView = binding.webView

        // Fundo escuro explícito do próprio WebView: evita o "flash" branco/preto
        // antes do CSS da página carregar (a view nasce com a cor de fundo do app).
        webView.setBackgroundColor(0xFF0A0E14.toInt())

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

            // Desliga o escurecimento automático do Android (force dark): sem ele,
            // uma página ainda sem estilo era tratada como "clara" e pintada de
            // preto por um instante. Usa a API nova quando disponível e cai pra
            // setForceDark em WebViews mais antigas; ambas guardadas por feature.
            if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(this, false)
            } else if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
                @Suppress("DEPRECATION")
                WebSettingsCompat.setForceDark(this, WebSettingsCompat.FORCE_DARK_OFF)
            }
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
                                        .setToolbarColor(0xFF0A0E14.toInt())
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
                        border:none;background:#2DD4A7;color:#052017;font-size:15px;font-weight:600;
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

            // Handles <input type="file"> — without this the file picker never opens in WebView
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams,
            ): Boolean {
                // Cancel any pending callback before starting a new one
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback
                try {
                    // Accept CSV and plain-text files; fall back to all files
                    filePickerLauncher.launch(
                        arrayOf("text/csv", "text/comma-separated-values", "text/plain", "*/*")
                    )
                } catch (_: Exception) {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = null
                }
                return true
            }
        }
    }

    // ---------- Swipe refresh ----------

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.apply {
            setColorSchemeColors(0xFF2DD4A7.toInt())
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
        downloadReceiver?.let { try { unregisterReceiver(it) } catch (_: Exception) {} }
        downloadReceiver = null
        binding.webView.destroy()
        super.onDestroy()
    }
}
