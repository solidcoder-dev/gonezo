package com.gonezo.multiplatform.audioextraction.infrastructure.source;

import android.content.Context;
import com.gonezo.audioextraction.application.pipeline.SourceLoader;
import com.gonezo.audioextraction.domain.contract.ExtractionRequest;
import com.gonezo.audioextraction.domain.error.AudioExtractionException;
import com.gonezo.audioextraction.domain.error.ErrorCode;
import com.gonezo.audioextraction.domain.model.SourceAudio;
import com.gonezo.audioextraction.infrastructure.source.DefaultSourceLoader;
import com.gonezo.multiplatform.storage.LoopbackTlsIdentity;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.logging.Logger;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLSocketFactory;

public final class LoopbackHttpsSourceLoader implements SourceLoader {
  private static final Logger LOGGER = Logger.getLogger("GonezoAudioExtract");
  private static final int CONNECT_TIMEOUT_MS = 5_000;
  private static final int READ_TIMEOUT_MS = 15_000;
  private final SourceLoader fallback;
  private final SSLSocketFactory sslSocketFactory;
  private final HostnameVerifier hostnameVerifier;

  public LoopbackHttpsSourceLoader(Context context) {
    this(context, new DefaultSourceLoader());
  }

  LoopbackHttpsSourceLoader(Context context, SourceLoader fallback) {
    Context appContext = context.getApplicationContext();
    this.fallback = fallback;
    this.sslSocketFactory = LoopbackTlsIdentity.createClientSocketFactory(appContext);
    this.hostnameVerifier = LoopbackTlsIdentity.createHostnameVerifier();
  }

  @Override
  public SourceAudio load(ExtractionRequest request) {
    ExtractionRequest.Source source = request.getSource();
    if (source == null || source.getType() == null || source.getValue() == null) {
      return fallback.load(request);
    }
    if (!"url".equals(source.getType())) {
      return fallback.load(request);
    }
    return loadHttpsSource(request, source.getValue());
  }

  private SourceAudio loadHttpsSource(ExtractionRequest request, String rawUrl) {
    String requestId = requestId(request);
    long startedAt = System.currentTimeMillis();

    URI uri;
    try {
      uri = URI.create(rawUrl);
    } catch (Exception ex) {
      logWarn("source_url_invalid requestId=" + requestId + " reason=" + ex.getClass().getSimpleName());
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load source url", ex);
    }

    if (!"https".equalsIgnoreCase(uri.getScheme())) {
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Source url must be https", null);
    }
    if (!LoopbackTlsIdentity.isLoopbackHost(uri.getHost())) {
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Source url host must be loopback", null);
    }

    String safeUrl = sanitizeUrl(uri);
    logInfo("source_url_fetch_start requestId=" + requestId + " url=" + safeUrl);

    HttpURLConnection connection;
    try {
      connection = (HttpURLConnection) uri.toURL().openConnection();
    } catch (Exception ex) {
      logWarn("source_url_open_failed requestId=" + requestId + " url=" + safeUrl + " reason=" + ex.getClass().getSimpleName());
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load source url", ex);
    }

    if (!(connection instanceof HttpsURLConnection httpsConnection)) {
      connection.disconnect();
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Source url must use HTTPS connection", null);
    }

    try {
      httpsConnection.setSSLSocketFactory(sslSocketFactory);
      httpsConnection.setHostnameVerifier(hostnameVerifier);
      httpsConnection.setConnectTimeout(CONNECT_TIMEOUT_MS);
      httpsConnection.setReadTimeout(READ_TIMEOUT_MS);
      httpsConnection.setInstanceFollowRedirects(false);
      httpsConnection.setRequestMethod("GET");
      httpsConnection.connect();

      int status = httpsConnection.getResponseCode();
      String contentType = httpsConnection.getContentType() == null ? "" : httpsConnection.getContentType();
      long contentLength = httpsConnection.getContentLengthLong();
      if (status < 200 || status >= 300) {
        logWarn(
          "source_url_fetch_failed requestId=" + requestId
            + " url=" + safeUrl
            + " status=" + status
            + " contentType=" + contentType
            + " contentLength=" + contentLength
            + " elapsedMs=" + (System.currentTimeMillis() - startedAt)
        );
        throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load source url (status=" + status + ")", null);
      }

      byte[] bytes;
      try (InputStream input = httpsConnection.getInputStream()) {
        bytes = input.readAllBytes();
      }
      logInfo(
        "source_url_fetch_ok requestId=" + requestId
          + " url=" + safeUrl
          + " status=" + status
          + " contentType=" + contentType
          + " contentLength=" + contentLength
          + " bytesLength=" + bytes.length
          + " elapsedMs=" + (System.currentTimeMillis() - startedAt)
      );

      Map<String, Object> metadata = new LinkedHashMap<>();
      metadata.put("sourceType", "url");
      metadata.put("requestId", requestId);
      return new SourceAudio(bytes, "audio/raw", rawUrl, metadata);
    } catch (AudioExtractionException ex) {
      throw ex;
    } catch (Exception ex) {
      logWarn(
        "source_url_fetch_exception requestId=" + requestId
          + " url=" + safeUrl
          + " reason=" + ex.getClass().getSimpleName()
          + " message=" + (ex.getMessage() == null ? "" : ex.getMessage())
          + " elapsedMs=" + (System.currentTimeMillis() - startedAt)
      );
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load source url", ex);
    } finally {
      httpsConnection.disconnect();
    }
  }

  private String requestId(ExtractionRequest request) {
    Object requestId = request.getContext().get("requestId");
    return requestId instanceof String && !((String) requestId).isBlank() ? (String) requestId : "n/a";
  }

  private String sanitizeUrl(URI uri) {
    String scheme = uri.getScheme() == null ? "https" : uri.getScheme().toLowerCase(Locale.ROOT);
    String host = uri.getHost() == null ? "unknown-host" : uri.getHost().toLowerCase(Locale.ROOT);
    String port = uri.getPort() > 0 ? ":" + uri.getPort() : "";
    String path = (uri.getPath() == null || uri.getPath().isBlank()) ? "/" : uri.getPath();
    return scheme + "://" + host + port + path;
  }

  private void logInfo(String message) {
    LOGGER.info(message);
  }

  private void logWarn(String message) {
    LOGGER.warning(message);
  }
}
