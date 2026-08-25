package com.nicron.webview;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;

/** Tiny local-first Android host for the bundled game. */
public final class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 7301;
    private static final String LOCAL_HOST = "appassets.androidplatform.net";
    private WebView webView;
    private ValueCallback<Uri[]> pendingFiles;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(7, 18, 38));
        getWindow().setNavigationBarColor(Color.rgb(7, 18, 38));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR & 0);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(7, 18, 38));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new LocalAssetsClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                try {
                    Intent intent = params.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("image/*");
                    startActivityForResult(Intent.createChooser(intent, "בחירת תמונה לדמות"), FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException error) {
                    pendingFiles = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });
        setContentView(webView);

        if (state == null) webView.loadUrl("https://" + LOCAL_HOST + "/index.html");
        else webView.restoreState(state);
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            if (pendingFiles != null) pendingFiles.onReceiveValue(result);
            pendingFiles = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (pendingFiles != null) pendingFiles.onReceiveValue(null);
        pendingFiles = null;
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }

    private final class LocalAssetsClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!LOCAL_HOST.equals(uri.getHost())) return super.shouldInterceptRequest(view, request);
            String path = uri.getPath();
            if (path == null || path.equals("/")) path = "/index.html";
            WebResourceResponse response = assetResponse(path.substring(1));
            return response != null ? response : assetResponse("index.html");
        }

        private WebResourceResponse assetResponse(String relativePath) {
            try {
                InputStream stream = getAssets().open("www/" + relativePath);
                String extension = MimeTypeMap.getFileExtensionFromUrl(relativePath);
                String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
                if (mime == null && relativePath.endsWith(".js")) mime = "application/javascript";
                if (mime == null && relativePath.endsWith(".webp")) mime = "image/webp";
                if (mime == null) mime = "application/octet-stream";
                return new WebResourceResponse(mime, "UTF-8", stream);
            } catch (IOException ignored) { return null; }
        }
    }
}
