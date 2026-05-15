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
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                // Links externos abrem no browser padrão
                return if (url.startsWith(APP_URL) || url.startsWith("https://gerenciador-psi.vercel.app")) {
                    false
                } else {
                    startActivity(Intent(Intent.ACTION_VIEW, url.toUri()))
                    true
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

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) {
                    // Mostra página de erro simples sem sair do app
                    view.loadData(
                        """
                        <html><body style="font-family:sans-serif;display:flex;flex-direction:column;
                        align-items:center;justify-content:center;height:100vh;margin:0;background:#111;color:#fff;text-align:center;padding:20px;">
                        <div style="font-size:48px;margin-bottom:16px;">📶</div>
                        <div style="font-size:18px;font-weight:600;margin-bottom:8px;">Sem conexão</div>
                        <div style="font-size:14px;color:#aaa;margin-bottom:24px;">Verifique sua internet e tente novamente.</div>
                        <button onclick="location.reload()" style="padding:12px 24px;border-radius:8px;border:none;
                        background:#c7f284;color:#111;font-size:15px;font-weight:600;cursor:pointer;">Tentar novamente</button>
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
                if (newProgress == 100) {
                    binding.progressBar.visibility = View.GONE
                }
            }

            // Permite alertas JavaScript
            override fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean {
                result.confirm()
                return false
            }

            override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean {
                result.confirm()
                return false
            }

            // Título da página
            override fun onReceivedTitle(view: WebView, title: String) {
                // Título fixo no app
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

    // Salva e restaura estado do WebView ao rotacionar a tela
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        binding.webView.restoreState(savedInstanceState)
    }

    // Pausa/retoma WebView com o ciclo de vida da Activity
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
