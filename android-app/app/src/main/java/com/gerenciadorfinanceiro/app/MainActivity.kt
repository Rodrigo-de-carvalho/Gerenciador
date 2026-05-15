package com.gerenciadorfinanceiro.app

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.net.toUri
import com.gerenciadorfinanceiro.app.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val APP_URL = "https://gerenciador-psi.vercel.app"

    // User-Agent móvel para a PWA renderizar em modo mobile (menu hamburguer, etc.)
    private val MOBILE_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/121.0.0.0 Mobile Safari/537.36"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupWebView()
        setupSwipeRefresh()

        if (savedInstanceState == null) {
            binding.webView.loadUrl(APP_URL)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val webView = binding.webView

        webView.settings.apply {
            // JavaScript — obrigatório para React apps
            javaScriptEnabled = true
            javaScriptCanOpenWindowsAutomatically = true

            // Armazenamento local — necessário para o login persistir
            domStorageEnabled = true
            databaseEnabled = true

            // User-Agent móvel → ativa CSS mobile do site (menu hamburguer)
            userAgentString = MOBILE_UA

            // Layout e zoom
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false

            // Cache
            cacheMode = WebSettings.LOAD_DEFAULT

            // Mídia
            mediaPlaybackRequiresUserGesture = false

            // Tamanho de fonte padrão
            defaultFontSize = 16
        }

        // Cookies — necessário para sessão/login
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url    = request.url.toString()
                val host   = request.url.host ?: ""
                val scheme = request.url.scheme ?: ""

                return when {
                    // Mantém no WebView: o próprio app
                    host.contains("gerenciador-psi.vercel.app") -> false
                    // Mantém no WebView: Supabase auth e APIs
                    host.contains("supabase.co") -> false
                    // Abre links HTTP/HTTPS externos no navegador do sistema
                    scheme == "https" || scheme == "http" -> {
                        try {
                            startActivity(Intent(Intent.ACTION_VIEW, url.toUri()))
                        } catch (_: Exception) { }
                        true
                    }
                    // Bloqueia todos os custom schemes (mercadopago://, etc.)
                    // sem tentar abrir outros apps
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
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) {
                    view.loadData(
                        """
                        <html><body style="font-family:sans-serif;display:flex;flex-direction:column;
                        align-items:center;justify-content:center;height:100vh;margin:0;
                        background:#111;color:#fff;text-align:center;padding:20px;">
                        <div style="font-size:48px;margin-bottom:16px;">📶</div>
                        <div style="font-size:18px;font-weight:600;margin-bottom:8px;">Sem conexão</div>
                        <div style="font-size:14px;color:#aaa;margin-bottom:24px;">
                          Verifique sua internet e tente novamente.</div>
                        <button onclick="location.reload()" style="padding:12px 24px;border-radius:8px;
                        border:none;background:#c7f284;color:#111;font-size:15px;font-weight:600;
                        cursor:pointer;">Tentar novamente</button>
                        </body></html>
                        """.trimIndent(),
                        "text/html",
                        "UTF-8"
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
                result.confirm()
                return false
            }

            override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean {
                result.confirm()
                return false
            }
        }
    }

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

    // Botão de voltar navega pelo histórico do WebView
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

    override fun onResume() {
        super.onResume()
        binding.webView.onResume()
    }

    override fun onDestroy() {
        binding.webView.destroy()
        super.onDestroy()
    }
}
