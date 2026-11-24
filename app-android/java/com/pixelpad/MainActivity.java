package com.pixelpad;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;

/**
 * Casca do PixelPad: acha o PC na rede local por UDP, abre o page do gamepad
 * em tela cheia e guarda o endereco para reconectar na proxima vez.
 */
public class MainActivity extends Activity {

    private static final int DISCOVERY_PORT = 9999;
    private static final int COR_FUNDO = 0xFF0D0F12;
    private static final int COR_TEXTO = 0xFFE6E8EC;
    private static final int COR_AZUL = 0xFF7DB6FF;

    private WebView web;
    private SharedPreferences prefs;
    private LinearLayout overlay;
    private TextView overlayTitulo;
    private TextView overlayDetalhe;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private volatile boolean procurando = false;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        telaCheia();

        prefs = getSharedPreferences("pixelpad", MODE_PRIVATE);

        web = new WebView(this);
        web.setBackgroundColor(COR_FUNDO);
        WebSettings cfg = web.getSettings();
        cfg.setJavaScriptEnabled(true);
        cfg.setDomStorageEnabled(true);          // o layout dos botoes fica no localStorage
        cfg.setDatabaseEnabled(true);
        cfg.setMediaPlaybackRequiresUserGesture(false);
        cfg.setSupportZoom(false);
        cfg.setBuiltInZoomControls(false);
        cfg.setCacheMode(WebSettings.LOAD_NO_CACHE);
        cfg.setLoadWithOverviewMode(true);
        cfg.setUseWideViewPort(true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                esconderOverlay();
            }

            @Override
            public void onReceivedError(WebView v, int codigo, String descricao, String url) {
                if (url != null && url.startsWith("http")) mostrarErro("Nao consegui falar com o PC", descricao);
            }
        });
        web.setWebChromeClient(new WebChromeClient());

        setContentView(web);
        montarOverlay();

        String salvo = prefs.getString("url", null);
        if (salvo != null) {
            mostrarOverlay("Conectando...", salvo);
            web.loadUrl(salvo);
        }
        procurar(true);
    }

    // ------------------------------------------------------------ descoberta

    /** Procura o PC na rede: broadcast UDP e espera a resposta com IP e token. */
    private void procurar(final boolean tentarDeNovo) {
        if (procurando) return;
        procurando = true;
        if (web.getUrl() == null) mostrarOverlay("Procurando o PC...", "ligue o PixelPad no computador");

        new Thread(new Runnable() {
            @Override
            public void run() {
                String achado = null;
                DatagramSocket socket = null;
                try {
                    socket = new DatagramSocket();
                    socket.setBroadcast(true);
                    socket.setSoTimeout(700);
                    byte[] pedido = "PIXELPAD?".getBytes("UTF-8");
                    InetAddress broadcast = InetAddress.getByName("255.255.255.255");

                    long limite = System.currentTimeMillis() + 3500;
                    int tentativas = 0;
                    while (achado == null && System.currentTimeMillis() < limite) {
                        // manda de novo: a primeira resposta pode se perder
                        if (tentativas % 3 == 0) {
                            socket.send(new DatagramPacket(pedido, pedido.length, broadcast, DISCOVERY_PORT));
                        }
                        tentativas++;
                        try {
                            byte[] buf = new byte[1024];
                            DatagramPacket resp = new DatagramPacket(buf, buf.length);
                            socket.receive(resp);
                            String texto = new String(buf, 0, resp.getLength(), "UTF-8");
                            if (!texto.startsWith("PIXELPAD!")) continue;
                            JSONObject json = new JSONObject(texto.substring(9));
                            achado = "http://" + json.getString("ip")
                                    + ":" + json.getInt("porta")
                                    + "/game?t=" + json.getString("token");
                        } catch (Exception ignorada) {
                            // timeout: tenta de novo ate o limite
                        }
                    }
                } catch (Exception e) {
                    achado = null;
                } finally {
                    if (socket != null) socket.close();
                }

                final String url = achado;
                ui.post(new Runnable() {
                    @Override
                    public void run() {
                        procurando = false;
                        if (url != null) conectar(url);
                        else if (web.getUrl() == null) {
                            mostrarErro("Nao achei o PC na rede",
                                    "O celular e o computador precisam estar no mesmo Wi-Fi.\n"
                                            + "Se o PixelPad nao estiver aberto no PC, abra o atalho dele.");
                        }
                    }
                });
            }
        }, "descoberta").start();
    }

    private void conectar(String url) {
        String atual = prefs.getString("url", null);
        if (url.equals(atual) && web.getUrl() != null) return;
        prefs.edit().putString("url", url).apply();
        esconderOverlay();
        web.loadUrl(url);
    }

    // ------------------------------------------------------------ tela

    private void telaCheia() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    private void montarOverlay() {
        overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setGravity(Gravity.CENTER);
        overlay.setBackgroundColor(COR_FUNDO);
        overlay.setPadding(48, 48, 48, 48);

        overlayTitulo = new TextView(this);
        overlayTitulo.setTextColor(COR_TEXTO);
        overlayTitulo.setTextSize(19);
        overlayTitulo.setGravity(Gravity.CENTER);
        overlay.addView(overlayTitulo);

        overlayDetalhe = new TextView(this);
        overlayDetalhe.setTextColor(0xFF8A94A3);
        overlayDetalhe.setTextSize(13);
        overlayDetalhe.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = 14;
        overlay.addView(overlayDetalhe, lp);

        Button tentar = new Button(this);
        tentar.setText("Tentar de novo");
        tentar.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mostrarOverlay("Procurando o PC...", "");
                procurar(false);
            }
        });
        LinearLayout.LayoutParams lpBtn = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lpBtn.topMargin = 28;
        overlay.addView(tentar, lpBtn);

        addContentView(overlay, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT));
        overlay.setVisibility(View.GONE);
    }

    private void mostrarOverlay(String titulo, String detalhe) {
        overlayTitulo.setText(titulo);
        overlayDetalhe.setText(detalhe);
        overlay.setVisibility(View.VISIBLE);
        overlay.bringToFront();
    }

    private void esconderOverlay() {
        overlay.setVisibility(View.GONE);
    }

    private void mostrarErro(String titulo, String detalhe) {
        mostrarOverlay(titulo, detalhe);
        overlayTitulo.setTextColor(COR_TEXTO);
        overlayDetalhe.setTextColor(0xFF8A94A3);
        overlayTitulo.setText(titulo);
    }

    // ------------------------------------------------------------ ciclo de vida

    @Override
    public void onBackPressed() {
        // voltar fecha o teclado/editor, mas nao mata o controle sem querer
        if (overlay.getVisibility() == View.VISIBLE) {
            moveTaskToBack(true);
            return;
        }
        moveTaskToBack(true);
    }

    @Override
    protected void onResume() {
        super.onResume();
        telaCheia();
        if (web.getUrl() == null) procurar(false);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) web.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
        }
        super.onDestroy();
    }
}
