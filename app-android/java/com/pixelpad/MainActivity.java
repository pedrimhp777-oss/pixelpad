package com.pixelpad;

import android.app.Activity;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Casca do PixelPad.
 *
 * Abre em pe, procura os PCs que estao rodando o PixelPad na rede local e
 * deixa voce escolher em qual conectar (util com dois PCs na mesma casa).
 * A escolha do estilo do controle vem depois, no /inicio, ainda em pe.
 * Quando o gamepad abre, a tela deita sozinha.
 */
public class MainActivity extends Activity {

    private static final int DISCOVERY_PORT = 9999;
    private static final int COR_FUNDO = 0xFF0D0F12;
    private static final int COR_CARTAO = 0xFF141A24;
    private static final int COR_BORDA = 0xFF1E2836;
    private static final int COR_TEXTO = 0xFFE6E8EC;
    private static final int COR_FRACA = 0xFF8A94A3;
    private static final int COR_AZUL = 0xFF2F6DF6;

    /** Um PC que respondeu ao broadcast. */
    private static class PC {
        String nome, ip, url, versao;
        int pads, max;
    }

    private WebView web;
    private SharedPreferences prefs;
    private FrameLayout raiz;
    private LinearLayout painel;
    private LinearLayout lista;
    private TextView status;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Map<String, PC> achados = new LinkedHashMap<>();
    private volatile boolean procurando = false;
    private boolean jaEscolheu = false;
    /** Mensagem que deve aparecer quando a busca terminar (ex.: PC fora do ar). */
    private String aviso = null;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // usa tambem a area do recorte da camera (senao o sistema deixa uma barra preta)
        WindowManager.LayoutParams attrs = getWindow().getAttributes();
        if (Build.VERSION.SDK_INT >= 30) {
            attrs.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
        } else if (Build.VERSION.SDK_INT >= 28) {
            attrs.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        getWindow().setAttributes(attrs);

        prefs = getSharedPreferences("pixelpad", MODE_PRIVATE);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

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

        web.addJavascriptInterface(new Ponte(), "PixelPad");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                // o gamepad e a unica tela que fica deitada
                if (url == null) return;
                if (url.contains("/game")) paisagem();
                else if (url.contains("/inicio")) retrato();
            }

            @Override
            public void onReceivedError(WebView v, int codigo, String descricao, String url) {
                if (url == null || !url.startsWith("http")) return;
                // caiu a conexao com o PC: volta pra lista
                ui.post(new Runnable() {
                    @Override
                    public void run() {
                        mostrarEscolha("Nao consegui falar com esse PC. Ele esta ligado?");
                    }
                });
            }
        });
        web.setWebChromeClient(new WebChromeClient());

        raiz = new FrameLayout(this);
        raiz.setBackgroundColor(COR_FUNDO);
        raiz.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        montarPainel();
        setContentView(raiz);
        telaCheia();   // precisa da view ja montada na janela

        procurar(true);
    }

    // ------------------------------------------------------------ descoberta

    /** Procura os PCs na rede: broadcast UDP e junta todas as respostas. */
    private void procurar(final boolean primeira) {
        if (procurando) return;
        procurando = true;
        if (primeira) status.setText("Procurando PCs na rede...");
        else status.setText("Procurando de novo...");

        new Thread(new Runnable() {
            @Override
            public void run() {
                synchronized (achados) { achados.clear(); }
                DatagramSocket socket = null;
                try {
                    socket = new DatagramSocket();
                    socket.setBroadcast(true);
                    socket.setSoTimeout(400);
                    byte[] pedido = "PIXELPAD?".getBytes("UTF-8");
                    InetAddress broadcast = InetAddress.getByName("255.255.255.255");

                    // 2,5s ouvindo: da tempo de varios PCs responderem
                    long limite = System.currentTimeMillis() + 2500;
                    long proximoEnvio = 0;
                    while (System.currentTimeMillis() < limite) {
                        if (System.currentTimeMillis() >= proximoEnvio) {
                            try { socket.send(new DatagramPacket(pedido, pedido.length, broadcast, DISCOVERY_PORT)); } catch (Exception e) {}
                            proximoEnvio = System.currentTimeMillis() + 500;
                        }
                        try {
                            byte[] buf = new byte[2048];
                            DatagramPacket resp = new DatagramPacket(buf, buf.length);
                            socket.receive(resp);
                            String texto = new String(buf, 0, resp.getLength(), "UTF-8");
                            if (!texto.startsWith("PIXELPAD!")) continue;
                            JSONObject json = new JSONObject(texto.substring(9));
                            PC p = new PC();
                            p.nome = json.optString("nome", "PC sem nome");
                            p.ip = json.getString("ip");
                            p.versao = json.optString("versao", "?");
                            p.pads = json.optInt("pads", 0);
                            p.max = json.optInt("max", 2);
                            p.url = "http://" + p.ip + ":" + json.getInt("porta")
                                    + "/inicio?t=" + json.getString("token");
                            synchronized (achados) { achados.put(p.ip, p); }
                        } catch (Exception ignorada) {
                            // timeout de 400ms: segue mandando pedido ate o limite
                        }
                    }
                } catch (Exception e) {
                    // rede bloqueada, sem socket...
                } finally {
                    if (socket != null) socket.close();
                }

                ui.post(new Runnable() {
                    @Override
                    public void run() {
                        procurando = false;
                        List<PC> encontrados;
                        synchronized (achados) { encontrados = new ArrayList<>(achados.values()); }

                        // um unico PC e o mesmo da ultima vez: entra direto
                        String ultimo = prefs.getString("url", null);
                        if (!jaEscolheu && encontrados.size() == 1 && ultimo != null
                                && ultimo.equals(encontrados.get(0).url)) {
                            conectar(encontrados.get(0).url);
                            return;
                        }
                        atualizarLista(encontrados);
                        if (aviso != null) {
                            status.setTextColor(0xFFFFB4B4);
                            status.setText(aviso);
                            aviso = null;
                        } else if (encontrados.isEmpty()) {
                            status.setTextColor(COR_FRACA);
                            status.setText("Nenhum PC encontrado.\nO PixelPad precisa estar aberto no computador,\n"
                                    + "e o celular no mesmo Wi-Fi.");
                        } else {
                            status.setTextColor(COR_FRACA);
                            status.setText(encontrados.size() == 1
                                    ? "1 PC encontrado" : encontrados.size() + " PCs encontrados");
                        }
                    }
                });
            }
        }, "descoberta").start();
    }

    private void atualizarLista(List<PC> pcs) {
        lista.removeAllViews();
        for (final PC p : pcs) {
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(dp(16), dp(14), dp(16), dp(14));
            card.setBackground(fundo(COR_CARTAO, COR_BORDA, 16));
            card.setClickable(true);
            card.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { conectar(p.url); }
            });

            TextView nome = new TextView(this);
            nome.setText(p.nome);
            nome.setTextColor(COR_TEXTO);
            nome.setTextSize(17);
            nome.setTypeface(null, android.graphics.Typeface.BOLD);
            card.addView(nome);

            String detalhe = p.ip;
            if (p.pads > 0) detalhe += "  ·  " + p.pads + " de " + p.max + " controles conectados";
            else detalhe += "  ·  livre";
            if (!"?".equals(p.versao)) detalhe += "  ·  v" + p.versao;

            TextView info = new TextView(this);
            info.setText(detalhe);
            info.setTextColor(COR_FRACA);
            info.setTextSize(12);
            LinearLayout.LayoutParams lpInfo = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lpInfo.topMargin = dp(4);
            card.addView(info, lpInfo);

            LinearLayout.LayoutParams lpCard = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lpCard.bottomMargin = dp(10);
            lista.addView(card, lpCard);
        }
    }

    private void conectar(String url) {
        jaEscolheu = true;
        prefs.edit().putString("url", url).apply();
        painel.setVisibility(View.GONE);
        web.setVisibility(View.VISIBLE);
        web.loadUrl(url);
    }

    // ------------------------------------------------------------ tela

    private void paisagem() {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
    }

    private void retrato() {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
    }

    /** Volta pra lista de PCs (o /inicio chama isso no botao "trocar de PC"). */
    private void mostrarEscolha(String avisoTexto) {
        retrato();
        jaEscolheu = false;
        painel.setVisibility(View.VISIBLE);
        painel.bringToFront();
        telaCheia();
        if (avisoTexto != null) {
            aviso = avisoTexto;
            status.setTextColor(0xFFFFB4B4);
            status.setText(avisoTexto);
            atualizarLista(new ArrayList<>(achados.values()));
        }
        procurar(false);
    }

    private void telaCheia() {
        View decor = getWindow().getDecorView();
        if (decor == null) return;   // ainda sem view na janela
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = decor.getWindowInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            decor.setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    private void montarPainel() {
        painel = new LinearLayout(this);
        painel.setOrientation(LinearLayout.VERTICAL);
        painel.setBackgroundColor(COR_FUNDO);
        painel.setPadding(dp(20), dp(28), dp(20), dp(18));
        painel.setClickable(true);   // nao deixa o toque vazar pro webview

        LinearLayout topo = new LinearLayout(this);
        topo.setOrientation(LinearLayout.HORIZONTAL);
        topo.setGravity(Gravity.CENTER_VERTICAL);

        TextView logo = new TextView(this);
        logo.setText("PP");
        logo.setTextColor(0xFF2A1600);
        logo.setTextSize(17);
        logo.setTypeface(null, android.graphics.Typeface.BOLD);
        logo.setGravity(Gravity.CENTER);
        GradientDrawable bgLogo = new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                new int[]{0xFFFFD34D, 0xFFF09100});
        bgLogo.setCornerRadius(dp(15));
        logo.setBackground(bgLogo);
        LinearLayout.LayoutParams lpLogo = new LinearLayout.LayoutParams(dp(52), dp(52));
        lpLogo.rightMargin = dp(13);
        topo.addView(logo, lpLogo);

        LinearLayout titulos = new LinearLayout(this);
        titulos.setOrientation(LinearLayout.VERTICAL);

        TextView titulo = new TextView(this);
        titulo.setText("PIXELPAD");
        titulo.setTextColor(0xFFF7C518);
        titulo.setTextSize(24);
        titulo.setTypeface(null, android.graphics.Typeface.BOLD_ITALIC);
        titulos.addView(titulo);

        TextView sub = new TextView(this);
        sub.setText("Escolha o computador");
        sub.setTextColor(COR_FRACA);
        sub.setTextSize(13);
        titulos.addView(sub);

        topo.addView(titulos);
        painel.addView(topo);

        ScrollView rolagem = new ScrollView(this);
        LinearLayout.LayoutParams lpRol = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f);
        lpRol.topMargin = dp(22);
        lista = new LinearLayout(this);
        lista.setOrientation(LinearLayout.VERTICAL);
        rolagem.addView(lista);
        painel.addView(rolagem, lpRol);

        status = new TextView(this);
        status.setText("Procurando PCs na rede...");
        status.setTextColor(COR_FRACA);
        status.setTextSize(12);
        status.setLineSpacing(dp(3), 1f);
        LinearLayout.LayoutParams lpStatus = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lpStatus.topMargin = dp(10);
        painel.addView(status, lpStatus);

        Button procurar = new Button(this);
        procurar.setText("Procurar de novo");
        procurar.setAllCaps(false);
        procurar.setTextColor(Color.WHITE);
        procurar.setTextSize(14);
        procurar.setTypeface(null, android.graphics.Typeface.BOLD);
        GradientDrawable bgBtn = new GradientDrawable();
        bgBtn.setColor(COR_AZUL);
        bgBtn.setCornerRadius(dp(12));
        procurar.setBackground(bgBtn);
        procurar.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { procurar(true); }
        });
        LinearLayout.LayoutParams lpBtn = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(48));
        lpBtn.topMargin = dp(12);
        painel.addView(procurar, lpBtn);

        TextView dica = new TextView(this);
        dica.setText("O celular e o PC precisam estar no mesmo Wi-Fi.");
        dica.setTextColor(0xFF4B5766);
        dica.setTextSize(11);
        dica.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lpDica = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lpDica.topMargin = dp(10);
        painel.addView(dica, lpDica);

        raiz.addView(painel, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.setVisibility(View.INVISIBLE);
    }

    /** Ponte usada pela pagina: mudar orientacao e voltar pra lista de PCs. */
    private class Ponte {
        @JavascriptInterface
        public void tela(final String modo) {
            if (modo == null) return;
            ui.post(new Runnable() {
                @Override
                public void run() {
                    if (modo.startsWith("terra") || modo.equals("retrato")) retrato();
                    else paisagem();
                }
            });
        }

        @JavascriptInterface
        public void dispositivos() {
            ui.post(new Runnable() {
                @Override
                public void run() { mostrarEscolha(null); }
            });
        }
    }

    private int dp(int v) {
        return (int) (v * getResources().getDisplayMetrics().density + 0.5f);
    }

    private GradientDrawable fundo(int cor, int borda, int raioDp) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(cor);
        d.setCornerRadius(dp(raioDp));
        d.setStroke(1, borda);
        return d;
    }

    // ------------------------------------------------------------ ciclo de vida

    @Override
    public void onBackPressed() {
        if (painel.getVisibility() != View.VISIBLE) {
            String atual = web.getUrl();
            if (atual != null && atual.contains("/game")) {
                // do controle, voltar leva pra escolha do estilo, nao fecha o app
                locationInicio(atual);
                return;
            }
            mostrarEscolha(null);
            return;
        }
        moveTaskToBack(true);
    }

    private void locationInicio(String atual) {
        retrato();
        int i = atual.indexOf("/game");
        if (i > 0) web.loadUrl(atual.substring(0, i) + "/inicio" + (atual.indexOf('?') > 0
                ? atual.substring(atual.indexOf('?')) : ""));
    }

    @Override
    protected void onResume() {
        super.onResume();
        ui.post(new Runnable() {
            @Override
            public void run() { telaCheia(); }
        });
        if (painel.getVisibility() == View.VISIBLE && achados.isEmpty()) procurar(false);
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
