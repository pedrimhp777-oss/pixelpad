package com.pixelpad;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.provider.Settings;
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

    // atualizacao do proprio APK: baixa do PC e abre o instalador do Android
    private DownloadManager downloads;
    private long baixando = -1;
    private BroadcastReceiver fimDownload;

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
        // o app abre sempre em pe: o manifest tambem e "portrait", porque em
        // Android 12+ pedir a orientacao no onCreate pode ser ignorado e a janela
        // nasce na orientacao do manifest (era o que deixava o A25 deitado)
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
        // a pagina se adapta sozinha (tudo em vmin/%): zoom automatico do WebView
        // so atrapalha - era o que deixava a tela "cortada" em alguns aparelhos
        cfg.setLoadWithOverviewMode(false);
        cfg.setUseWideViewPort(false);

        web.addJavascriptInterface(new Ponte(), "PixelPad");

        // ---- atualizacao: baixa o APK servido pelo PC e chama o instalador
        downloads = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        fimDownload = new BroadcastReceiver() {
            @Override
            public void onReceive(Context c, Intent i) {
                if (!DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(i.getAction())) return;
                long id = i.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != baixando) return;
                baixando = -1;
                Uri apk = null;
                try { apk = downloads.getUriForDownloadedFile(id); } catch (Exception e) {}
                if (apk == null) { avisarJs("Nao consegui baixar. Tente de novo."); return; }
                instalar(apk);
            }
        };
        IntentFilter filtro = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(fimDownload, filtro, Context.RECEIVER_EXPORTED);
        else registerReceiver(fimDownload, filtro);

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

                        // sem auto-conexao: o usuario escolhe no toque (pode haver outro
                        // PixelPad na rede, e entrar sozinho no PC errado seria pior)
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

        // se algum PC da rede tem versao mais nova que este APK, avisa antes de tudo
        String meu = versaoDoApp();
        for (PC p : pcs) {
            if (!"?".equals(p.versao) && maisNovo(p.versao, meu)) {
                lista.addView(cartaoAtualizacao(p, meu));
                break;
            }
        }

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

    /** Cartao azul no topo da lista: "tem versao nova, toque pra baixar". */
    private View cartaoAtualizacao(final PC p, String meu) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(16), dp(13), dp(16), dp(13));
        card.setBackground(fundo(0xFF152238, 0xFF2F6DF6, 16));
        card.setClickable(true);
        card.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                baixarAtualizacao(p.url.replaceAll("/inicio.*$", "/android"), p.versao);
            }
        });

        TextView titulo = new TextView(this);
        titulo.setText("⚡  Atualização do app");
        titulo.setTextColor(0xFF9CC4FF);
        titulo.setTextSize(15);
        titulo.setTypeface(null, android.graphics.Typeface.BOLD);
        card.addView(titulo);

        TextView info = new TextView(this);
        info.setText("v" + meu + " → v" + p.versao + "  ·  toque para baixar e instalar");
        info.setTextColor(0xFF8FA6C4);
        info.setTextSize(12);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(4);
        card.addView(info, lp);

        LinearLayout.LayoutParams lpCard = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lpCard.bottomMargin = dp(10);
        card.setLayoutParams(lpCard);
        return card;
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
        reajustarWeb();
    }

    private void retrato() {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        reajustarWeb();
    }

    /**
     * Alguns aparelhos (Android 12+) trocam a orientacao sem o WebView perceber,
     * e a pagina fica desenhada com o tamanho antigo - botoes cortados. Isso
     * remedeia: pede layout de novo e avisa o JS pra recalcular.
     */
    private void reajustarWeb() {
        if (web == null) return;
        for (int atraso : new int[]{ 150, 500, 1200 }) {
            ui.postDelayed(new Runnable() {
                @Override
                public void run() {
                    try {
                        web.requestLayout();
                        web.invalidate();
                        web.evaluateJavascript(
                            "(function(){window.dispatchEvent(new Event('resize'));" +
                            "if(window.visualViewport)window.visualViewport.dispatchEvent(new Event('resize'));})()",
                            null);
                    } catch (Exception e) {}
                }
            }, atraso);
        }
    }

    @Override
    public void onConfigurationChanged(android.content.res.Configuration nova) {
        super.onConfigurationChanged(nova);
        reajustarWeb();
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
    // ------------------------------------------------------------ atualizacao

    /** Versao instalada deste APK, ex.: "0.12.0". */
    private String versaoDoApp() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
        catch (Exception e) { return "?"; }
    }

    /** Compara "0.12.0" com "0.12.10" sem cair na armadilha do texto. */
    private static boolean maisNovo(String a, String b) {
        String[] x = String.valueOf(a).split("\\.");
        String[] y = String.valueOf(b).split("\\.");
        int n = Math.max(x.length, y.length);
        for (int i = 0; i < n; i++) {
            int p = i < x.length ? numero(x[i]) : 0;
            int q = i < y.length ? numero(y[i]) : 0;
            if (p != q) return p > q;
        }
        return false;
    }

    private static int numero(String v) {
        try { return Integer.parseInt(v.replaceAll("[^0-9].*$", "")); } catch (Exception e) { return 0; }
    }

    /** Baixa o APK do PC e, no fim, abre o instalador do Android. */
    private void baixarAtualizacao(String url, String versaoNova) {
        if (downloads == null) { avisarJs("Sem gerenciador de download neste aparelho"); return; }
        if (baixando != -1) { avisarJs("Ja estou baixando a atualizacao..."); return; }
        try {
            DownloadManager.Request pedido = new DownloadManager.Request(Uri.parse(url));
            pedido.setTitle("PixelPad " + versaoNova);
            pedido.setDescription("Baixando a versao nova");
            pedido.setMimeType("application/vnd.android.package-archive");
            pedido.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
            // nome novo a cada download: o DownloadManager falha se o arquivo ja existe
            java.io.File pasta = getExternalFilesDir(null);
            if (pasta != null && pasta.isDirectory()) {
                java.io.File[] velhos = pasta.listFiles();
                if (velhos != null) for (java.io.File f : velhos) {
                    if (f.getName().startsWith("PixelPad-atualizacao")) f.delete();
                }
            }
            pedido.setDestinationInExternalFilesDir(this, null,
                    "PixelPad-atualizacao-" + System.currentTimeMillis() + ".apk");
            baixando = downloads.enqueue(pedido);
            avisarJs("Baixando a atualizacao...");
            status.setTextColor(COR_FRACA);
            status.setText("Baixando a atualizacao do app...");
            acompanhar();
        } catch (Exception e) {
            baixando = -1;
            avisarJs("Nao consegui baixar: " + e.getMessage());
        }
    }

    /** Mostra o progresso na tela enquanto o download roda. */
    private void acompanhar() {
        final long id = baixando;
        ui.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (baixando != id) return;
                Cursor c = null;
                try {
                    c = downloads.query(new DownloadManager.Query().setFilterById(id));
                    if (c != null && c.moveToFirst()) {
                        int total = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                        int feito = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                        int pct = total > 0 ? (int) (feito * 100L / total) : -1;
                        String txt = pct >= 0 ? "Baixando... " + pct + "%" : "Baixando...";
                        status.setText(txt);
                        avisarJs(txt);
                    }
                } catch (Exception e) {
                } finally {
                    if (c != null) c.close();
                }
                ui.postDelayed(this, 400);
            }
        }, 400);
    }

    /** Abre a tela de instalacao do Android com o APK baixado. */
    private void instalar(Uri apk) {
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            // uma vez so: liberar "instalar apps desconhecidos" pro PixelPad
            avisarJs("Libere a instalacao para o PixelPad e toque em baixar de novo");
            try {
                startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + getPackageName())));
            } catch (Exception e) {
                avisarJs("Abra as permissoes do app e libere a instalacao");
            }
            return;
        }
        status.setText("Confirme a instalacao na tela do Android");
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(apk, "application/vnd.android.package-archive");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { startActivity(i); }
        catch (Exception e) { avisarJs("Nao consegui abrir o instalador: " + e.getMessage()); }
    }

    /** Fala com a pagina (ela mostra o aviso no rodape). */
    private void avisarJs(final String txt) {
        if (web == null) return;
        final String js = "window.ppAviso && window.ppAviso(" + JSONObject.quote(txt) + ")";
        ui.post(new Runnable() {
            @Override
            public void run() { try { web.evaluateJavascript(js, null); } catch (Exception e) {} }
        });
    }

    private class Ponte {
        /** Versao instalada deste app (lida do proprio APK), ex.: "0.11.0". */
        @JavascriptInterface
        public String versao() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "?";
            }
        }

        /** Baixa o APK novo do PC e abre o instalador (1 toque, sem navegador). */
        @JavascriptInterface
        public void atualizar(final String url) {
            if (url == null || !url.startsWith("http")) return;
            ui.post(new Runnable() {
                @Override
                public void run() { baixarAtualizacao(url, "nova"); }
            });
        }

        /** Versao do PC, pra tela comparar sem precisar pedir de novo. */
        @JavascriptInterface
        public String versaoApp() { return versaoDoApp(); }

        /** Abre um link no navegador do celular (usado pra baixar o APK novo). */
        @JavascriptInterface
        public void abrir(final String url) {
            if (url == null || !url.startsWith("http")) return;
            ui.post(new Runnable() {
                @Override
                public void run() {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    } catch (Exception e) {
                        status.setTextColor(0xFFFFB4B4);
                        status.setText("Nao consegui abrir o navegador");
                    }
                }
            });
        }

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
            // dentro do site, voltar anda uma tela pra tras (macros -> inicio -> lista)
            if (atual != null && atual.startsWith("http")) {
                if (atual.contains("/inicio")) mostrarEscolha(null);
                else irPara(atual, "/inicio");
                return;
            }
            mostrarEscolha(null);
            return;
        }
        moveTaskToBack(true);
    }

    /** Troca a rota mantendo o host e o token. */
    private void irPara(String atual, String rota) {
        String base = atual;
        int q = atual.indexOf('?');
        String query = q > 0 ? atual.substring(q) : "";
        int corte = atual.indexOf('/', atual.indexOf("//") + 3);
        if (corte > 0) base = atual.substring(0, corte);
        web.loadUrl(base + rota + query);
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
        try { if (fimDownload != null) unregisterReceiver(fimDownload); } catch (Exception e) {}
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
        }
        super.onDestroy();
    }
}
